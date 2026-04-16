import { createHash } from "node:crypto";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ArgosDeploymentStackPropsSchema = z.object({
  stage: z.enum(["development", "production"]).default("development"),
  hostedZoneId: z.string(),
  apiBaseUrl: z.url().default("https://foal-great-publicly.ngrok-free.app"),
  appUserArns: z.array(z.string()).min(1),
});

type ArgosDeploymentStackOwnProps = z.infer<
  typeof ArgosDeploymentStackPropsSchema
>;

interface ArgosDeploymentStackProps
  extends cdk.StackProps, ArgosDeploymentStackOwnProps {}

const STAGE_DOMAINS: Record<ArgosDeploymentStackProps["stage"], string> = {
  development: "dev.argos-ci.live",
  production: "argos-ci.live",
};

export class ArgosDeploymentStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly filesTable: dynamodb.Table;
  public readonly deploymentFilesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: ArgosDeploymentStackProps) {
    super(scope, id, props);

    const { stage, hostedZoneId, apiBaseUrl, appUserArns = [] } = props;
    const isProduction = stage === "production";
    const baseDomain = STAGE_DOMAINS[stage];
    const filesOriginAuthHeaderName = "x-argos-internal-auth";
    const filesOriginAuthHeaderValue = createHash("sha256")
      .update(`${id}:${stage}:${hostedZoneId}:files-origin-auth`)
      .digest("hex");

    // ----------------------------------------------------------------
    // S3 Bucket — content-addressed storage for deployment assets
    // ----------------------------------------------------------------
    this.bucket = new s3.Bucket(this, "DeploymentBucket", {
      bucketName: `argos-deployments-${stage}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
    });

    // ----------------------------------------------------------------
    // DynamoDB — files table (content hash → S3 key)
    // ----------------------------------------------------------------
    this.filesTable = new dynamodb.Table(this, "FilesTable", {
      tableName: `${stage}_files`,
      partitionKey: {
        name: "content_hash",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: isProduction,
      },
    });

    // ----------------------------------------------------------------
    // DynamoDB — deployment files (deploymentId + path → content hash)
    // ----------------------------------------------------------------
    this.deploymentFilesTable = new dynamodb.Table(
      this,
      "DeploymentFilesTable",
      {
        tableName: `${stage}_deployment_files`,
        partitionKey: {
          name: "deployment_id",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "path",
          type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: isProduction
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: isProduction,
        },
      },
    );

    // ----------------------------------------------------------------
    // ACM Certificate — wildcard for *.{baseDomain}
    // ----------------------------------------------------------------
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      { hostedZoneId, zoneName: baseDomain },
    );

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: `*.${baseDomain}`,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // ----------------------------------------------------------------
    // Lambda@Edge — VIEWER_REQUEST
    // Resolves alias → deploymentId and forwards to the files domain
    // as /deployment/<id>/<file>.
    // ----------------------------------------------------------------
    const viewerRequestFn = new nodejs.NodejsFunction(this, "ViewerRequestFn", {
      entry: path.join(__dirname, "../lambda/resolve-alias-viewer-request.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      logGroup: new cdk.aws_logs.LogGroup(this, "ViewerRequestFnLogGroup", {
        retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      }),
      bundling: {
        minify: true,
        sourceMap: false,
        target: "es2022",
        define: {
          "process.env.API_BASEURL": JSON.stringify(apiBaseUrl),
        },
      },
    });

    const viewerRequestRole = viewerRequestFn.role as iam.Role | undefined;
    viewerRequestRole?.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("edgelambda.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      }),
    );
    viewerRequestFn.currentVersion.addPermission(
      "AllowCloudFrontViewerInvoke",
      {
        principal: new iam.ServicePrincipal("edgelambda.amazonaws.com"),
        action: "lambda:InvokeFunction",
      },
    );

    // ----------------------------------------------------------------
    // Lambda@Edge — ORIGIN_REQUEST
    // Resolves /deployment/<id>/<file> → content hash → S3 key.
    // ----------------------------------------------------------------
    const originRequestFn = new nodejs.NodejsFunction(this, "OriginRequestFn", {
      entry: path.join(
        __dirname,
        "../lambda/resolve-deployment-file-origin-request.ts",
      ),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      logGroup: new cdk.aws_logs.LogGroup(this, "OriginRequestFnLogGroup", {
        retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      }),
      bundling: {
        minify: true,
        sourceMap: false,
        target: "es2022",
        define: { "process.env.STAGE": JSON.stringify(stage) },
      },
    });

    this.deploymentFilesTable.grantReadData(originRequestFn);

    const originRequestRole = originRequestFn.role as iam.Role | undefined;
    originRequestRole?.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("edgelambda.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      }),
    );
    originRequestFn.currentVersion.addPermission("AllowCloudFrontInvoke", {
      principal: new iam.ServicePrincipal("edgelambda.amazonaws.com"),
      action: "lambda:InvokeFunction",
    });

    // ----------------------------------------------------------------
    // Lambda@Edge — VIEWER_REQUEST (files distribution)
    // Rejects direct public access unless the request carries the
    // internal auth header injected by the alias distribution.
    // ----------------------------------------------------------------
    const protectFilesViewerRequestFn = new nodejs.NodejsFunction(
      this,
      "ProtectFilesViewerRequestFn",
      {
        entry: path.join(
          __dirname,
          "../lambda/protect-files-viewer-request.ts",
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_24_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        logGroup: new cdk.aws_logs.LogGroup(
          this,
          "ProtectFilesViewerRequestFnLogGroup",
          {
            retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
          },
        ),
        bundling: {
          minify: true,
          sourceMap: false,
          target: "es2022",
          define: {
            "process.env.INTERNAL_AUTH_HEADER_NAME": JSON.stringify(
              filesOriginAuthHeaderName,
            ),
            "process.env.INTERNAL_AUTH_HEADER_VALUE": JSON.stringify(
              filesOriginAuthHeaderValue,
            ),
          },
        },
      },
    );

    const protectFilesViewerRequestRole = protectFilesViewerRequestFn.role as
      | iam.Role
      | undefined;
    protectFilesViewerRequestRole?.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("edgelambda.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      }),
    );
    protectFilesViewerRequestFn.currentVersion.addPermission(
      "AllowCloudFrontProtectFilesViewerInvoke",
      {
        principal: new iam.ServicePrincipal("edgelambda.amazonaws.com"),
        action: "lambda:InvokeFunction",
      },
    );

    // ----------------------------------------------------------------
    // CloudFront — cache key is path-only.
    // ----------------------------------------------------------------
    const cachePolicy = new cloudfront.CachePolicy(this, "CachePolicy", {
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
    });

    const filesDistribution = new cloudfront.Distribution(
      this,
      "FilesDistribution",
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          edgeLambdas: [
            {
              eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
              functionVersion: protectFilesViewerRequestFn.currentVersion,
            },
            {
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              functionVersion: originRequestFn.currentVersion,
            },
          ],
          cachePolicy,
        },
      },
    );

    const aliasDistribution = new cloudfront.Distribution(
      this,
      "AliasDistribution",
      {
        defaultBehavior: {
          origin: new origins.HttpOrigin(
            filesDistribution.distributionDomainName,
            {
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
              customHeaders: {
                [filesOriginAuthHeaderName]: filesOriginAuthHeaderValue,
              },
            },
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          edgeLambdas: [
            {
              eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
              functionVersion: viewerRequestFn.currentVersion,
            },
          ],
          cachePolicy,
        },
        domainNames: [`*.${baseDomain}`],
        certificate,
      },
    );

    // ----------------------------------------------------------------
    // Route 53 — wildcard *.{baseDomain} → alias distribution
    // ----------------------------------------------------------------
    new route53.ARecord(this, "WildcardAlias", {
      zone: hostedZone,
      recordName: `*.${baseDomain}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(aliasDistribution),
      ),
    });

    const distribution = aliasDistribution;

    // ----------------------------------------------------------------
    // Dev user access
    // ----------------------------------------------------------------
    if (appUserArns.length > 0) {
      const devGroup = new iam.Group(this, "DevGroup");
      this.filesTable.grantReadWriteData(devGroup);
      this.deploymentFilesTable.grantReadWriteData(devGroup);
      this.bucket.grantReadWrite(devGroup);

      for (const arn of appUserArns) {
        const user = iam.User.fromUserArn(
          this,
          `DevUser-${arn.split("/").pop()}`,
          arn,
        );
        devGroup.addUser(user);
      }
    }

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "BucketName", { value: this.bucket.bucketName });
    new cdk.CfnOutput(this, "FilesTableName", {
      value: this.filesTable.tableName,
    });
    new cdk.CfnOutput(this, "DeploymentFilesTableName", {
      value: this.deploymentFilesTable.tableName,
    });
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
    new cdk.CfnOutput(this, "FilesDistributionDomainName", {
      value: filesDistribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "FilesDistributionId", {
      value: filesDistribution.distributionId,
    });
    new cdk.CfnOutput(this, "ApiBaseUrl", {
      value: apiBaseUrl,
    });
  }
}
