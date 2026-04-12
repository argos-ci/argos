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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ArgosDeploymentStackProps extends cdk.StackProps {
  stage: "development" | "production";
  hostedZoneId: string;
  /** Domain for the deployment CDN (e.g. "deploy.dev.argos-ci.com").
   *  DNS is managed externally — a CNAME must be added manually. */
  deploymentDomain: string;
  devUserArns?: string[];
}
const STAGE_DOMAINS: Record<ArgosDeploymentStackProps["stage"], string> = {
  development: "dev.argos-ci.live",
  production: "argos-ci.live",
};

export class ArgosDeploymentStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly filesTable: dynamodb.Table;
  public readonly deploymentFilesTable: dynamodb.Table;
  public readonly deploymentAliasesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: ArgosDeploymentStackProps) {
    super(scope, id, props);

    const { stage, hostedZoneId, deploymentDomain, devUserArns = [] } = props;
    const isProduction = stage === "production";
    const baseDomain = STAGE_DOMAINS[stage];

    // ----------------------------------------------------------------
    // S3 Bucket — content-addressed storage for Deployment assets
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
        sortKey: { name: "path", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: isProduction
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: isProduction,
        },
        timeToLiveAttribute: "expires_at",
      },
    );

    // ----------------------------------------------------------------
    // DynamoDB — deployment aliases (alias → deployment)
    // ----------------------------------------------------------------
    this.deploymentAliasesTable = new dynamodb.Table(
      this,
      "DeploymentAliasesTable",
      {
        tableName: `${stage}_deployment_aliases`,
        partitionKey: {
          name: "alias",
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
    // Hosted zone & ACM certificates
    // ----------------------------------------------------------------
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      { hostedZoneId, zoneName: baseDomain },
    );

    // Alias CDN — wildcard cert for *.{baseDomain}, validated via Route53
    const aliasCertificate = new acm.Certificate(this, "AliasCertificate", {
      domainName: `*.${baseDomain}`,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Deployment CDN — cert for {deploymentDomain} (e.g. deploy.dev.argos-ci.com).
    // DNS is managed externally (Cloudflare): CDK will output the CNAME record
    // to add for validation. The distribution won't become active until it's added.
    const deploymentCertificate = new acm.Certificate(
      this,
      "DeploymentCertificate",
      {
        domainName: deploymentDomain,
        validation: acm.CertificateValidation.fromDns(),
      },
    );

    // ----------------------------------------------------------------
    // Lambda@Edge — Deployment CDN origin request
    // Resolves /<deploymentId>/<path> → /content/<hash> in S3.
    // Only needs access to the deployment_files table.
    // ----------------------------------------------------------------
    const deploymentOriginRequestFn = new nodejs.NodejsFunction(
      this,
      "DeploymentOriginRequestFn",
      {
        entry: path.join(__dirname, "../lambda/deployment-origin-request.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_24_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        logGroup: new cdk.aws_logs.LogGroup(
          this,
          "DeploymentOriginRequestFnLogGroup",
          { retention: cdk.aws_logs.RetentionDays.ONE_MONTH },
        ),
        bundling: {
          minify: true,
          sourceMap: false,
          target: "es2022",
          define: {
            "process.env.STAGE": JSON.stringify(stage),
          },
        },
      },
    );

    this.deploymentFilesTable.grantReadData(deploymentOriginRequestFn);

    const deploymentOriginRequestRole = deploymentOriginRequestFn.role as
      | iam.Role
      | undefined;
    deploymentOriginRequestRole?.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("edgelambda.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      }),
    );
    deploymentOriginRequestFn.currentVersion.addPermission(
      "AllowCloudFrontInvoke",
      {
        principal: new iam.ServicePrincipal("edgelambda.amazonaws.com"),
        action: "lambda:InvokeFunction",
      },
    );

    // ----------------------------------------------------------------
    // Lambda@Edge — Alias CDN viewer request
    // Prepends the subdomain to the URI so the cache key is path-scoped
    // and targeted invalidation (/<alias>/*) is possible.
    // ----------------------------------------------------------------
    const viewerRequestFn = new nodejs.NodejsFunction(this, "ViewerRequestFn", {
      entry: path.join(__dirname, "../lambda/alias-viewer-request.ts"),
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
      },
    });

    const viewerRequestRole = viewerRequestFn.role as iam.Role | undefined;
    viewerRequestRole?.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("edgelambda.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      }),
    );

    // ----------------------------------------------------------------
    // Lambda@Edge — Alias CDN origin request
    // Resolves alias → deploymentId, then forwards the request to the
    // deployment CDN by rewriting the URI and changing the origin.
    // Only needs access to the deployment_aliases table.
    // ----------------------------------------------------------------
    const aliasOriginRequestFn = new nodejs.NodejsFunction(
      this,
      "AliasOriginRequestFn",
      {
        entry: path.join(__dirname, "../lambda/alias-origin-request.ts"),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_24_X,
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        logGroup: new cdk.aws_logs.LogGroup(
          this,
          "AliasOriginRequestFnLogGroup",
          { retention: cdk.aws_logs.RetentionDays.ONE_MONTH },
        ),
        bundling: {
          minify: true,
          sourceMap: false,
          target: "es2022",
          define: {
            "process.env.STAGE": JSON.stringify(stage),
            "process.env.DEPLOYMENT_DOMAIN": JSON.stringify(deploymentDomain),
          },
        },
      },
    );

    this.deploymentAliasesTable.grantReadData(aliasOriginRequestFn);

    const aliasOriginRequestRole = aliasOriginRequestFn.role as
      | iam.Role
      | undefined;
    aliasOriginRequestRole?.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("edgelambda.amazonaws.com")],
        actions: ["sts:AssumeRole"],
      }),
    );
    aliasOriginRequestFn.currentVersion.addPermission("AllowCloudFrontInvoke", {
      principal: new iam.ServicePrincipal("edgelambda.amazonaws.com"),
      action: "lambda:InvokeFunction",
    });

    // ----------------------------------------------------------------
    // Deployment CDN — immutable content, keyed on /<deploymentId>/<path>
    // Never invalidated. S3 OAC origin.
    // ----------------------------------------------------------------
    const deploymentCachePolicy = new cloudfront.CachePolicy(
      this,
      "DeploymentCachePolicy",
      {
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        defaultTtl: cdk.Duration.days(365),
        maxTtl: cdk.Duration.days(365),
      },
    );

    const deploymentDistribution = new cloudfront.Distribution(
      this,
      "DeploymentDistribution",
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          edgeLambdas: [
            {
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              functionVersion: deploymentOriginRequestFn.currentVersion,
            },
          ],
          cachePolicy: deploymentCachePolicy,
        },
        domainNames: [deploymentDomain],
        certificate: deploymentCertificate,
      },
    );
    // DNS for {deploymentDomain} is managed externally (Cloudflare).
    // Add a CNAME manually: deploymentDomain → deploymentDistribution.distributionDomainName

    // ----------------------------------------------------------------
    // Alias CDN — resolves aliases, caches per /<alias>/<path>
    // Invalidate /<alias>/* when an alias points to a new deployment.
    // Origin is the deployment CDN.
    // ----------------------------------------------------------------
    const aliasCachePolicy = new cloudfront.CachePolicy(
      this,
      "AliasCachePolicy",
      {
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        defaultTtl: cdk.Duration.days(365),
        maxTtl: cdk.Duration.days(365),
      },
    );

    const aliasDistribution = new cloudfront.Distribution(
      this,
      "AliasDistribution",
      {
        defaultBehavior: {
          origin: new origins.HttpOrigin(deploymentDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          edgeLambdas: [
            {
              eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
              functionVersion: viewerRequestFn.currentVersion,
            },
            {
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              functionVersion: aliasOriginRequestFn.currentVersion,
            },
          ],
          cachePolicy: aliasCachePolicy,
        },
        domainNames: [`*.${baseDomain}`],
        certificate: aliasCertificate,
      },
    );

    // ----------------------------------------------------------------
    // Route 53 — wildcard *.{baseDomain} → alias CDN
    // ----------------------------------------------------------------
    new route53.ARecord(this, "WildcardAlias", {
      zone: hostedZone,
      recordName: `*.${baseDomain}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(aliasDistribution),
      ),
    });

    // ----------------------------------------------------------------
    // Dev user access
    // ----------------------------------------------------------------
    if (devUserArns.length > 0) {
      const devGroup = new iam.Group(this, "DevGroup");
      this.filesTable.grantReadWriteData(devGroup);
      this.deploymentFilesTable.grantReadWriteData(devGroup);
      this.deploymentAliasesTable.grantReadWriteData(devGroup);
      this.bucket.grantReadWrite(devGroup);
      // Only the alias distribution needs invalidation — deployment CDN is immutable
      devGroup.addToPolicy(
        new iam.PolicyStatement({
          actions: ["cloudfront:CreateInvalidation"],
          resources: [
            `arn:aws:cloudfront::${this.account}:distribution/${aliasDistribution.distributionId}`,
          ],
        }),
      );

      for (const arn of devUserArns) {
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
    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
    });
    new cdk.CfnOutput(this, "FilesTableName", {
      value: this.filesTable.tableName,
    });
    new cdk.CfnOutput(this, "DeploymentFilesTableName", {
      value: this.deploymentFilesTable.tableName,
    });
    new cdk.CfnOutput(this, "DeploymentAliasesTableName", {
      value: this.deploymentAliasesTable.tableName,
    });
    new cdk.CfnOutput(this, "DeploymentDistributionDomainName", {
      value: deploymentDistribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "DeploymentDistributionId", {
      value: deploymentDistribution.distributionId,
    });
    new cdk.CfnOutput(this, "AliasDistributionDomainName", {
      value: aliasDistribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "AliasDistributionId", {
      value: aliasDistribution.distributionId,
    });
  }
}
