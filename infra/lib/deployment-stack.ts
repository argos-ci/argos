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

    const { stage, hostedZoneId, devUserArns = [] } = props;
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
    const replicationRegions = isProduction
      ? ["us-east-1", "eu-west-1"]
      : undefined;

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
      replicationRegions,
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
        replicationRegions,
      },
    );

    // ----------------------------------------------------------------
    // DynamoDB — deployments alises (alias → deployment)
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
        replicationRegions,
      },
    );

    // ----------------------------------------------------------------
    // Lambda@Edge — Origin Request handler
    // ----------------------------------------------------------------
    const originRequestFn = new nodejs.NodejsFunction(this, "OriginRequestFn", {
      entry: path.join(__dirname, "../lambda/origin-request.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      bundling: {
        minify: true,
        sourceMap: false,
        target: "es2022",
        define: {
          "process.env.STAGE": JSON.stringify(stage),
        },
      },
    });

    // Grant the Lambda@Edge function read access to DynamoDB tables
    this.deploymentFilesTable.grantReadData(originRequestFn);
    this.deploymentAliasesTable.grantReadData(originRequestFn);

    // ----------------------------------------------------------------
    // ACM Certificate — wildcard for the domain
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
    // CloudFront Distribution
    // ----------------------------------------------------------------
    const originRequestFnVersion = new lambda.Version(
      this,
      "OriginRequestFnVersion",
      {
        lambda: originRequestFn,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    );

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        edgeLambdas: [
          {
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
            functionVersion: originRequestFnVersion,
          },
        ],
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      domainNames: [`*.${baseDomain}`],
      certificate,
    });

    // ----------------------------------------------------------------
    // Route 53 — wildcard CNAME
    // ----------------------------------------------------------------
    new route53.ARecord(this, "WildcardAlias", {
      zone: hostedZone,
      recordName: `*.${baseDomain}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });

    // ----------------------------------------------------------------
    // Dev user access — full read/write on all tables and bucket
    // ----------------------------------------------------------------
    if (devUserArns.length > 0) {
      const devUsers = devUserArns.map((arn) =>
        iam.User.fromUserArn(this, `DevUser-${arn.split("/").pop()}`, arn),
      );
      for (const user of devUsers) {
        this.filesTable.grantReadWriteData(user);
        this.deploymentFilesTable.grantReadWriteData(user);
        this.deploymentAliasesTable.grantReadWriteData(user);
        this.bucket.grantReadWrite(user);
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
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.distributionDomainName,
    });
  }
}
