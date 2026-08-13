import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ArgosAssetsStackPropsSchema = z.object({
  stage: z.enum(["development", "production"]),
  /** Host the assets are served from, e.g. `assets.argos-ci.com`. */
  domainName: z.string(),
  /**
   * ACM certificate for `domainName`, issued in us-east-1 and validated once by
   * hand.
   *
   * `argos-ci.com` is not a Route 53 zone, so CDK can neither look the zone up
   * nor write the alias record — unlike `argos-ci.live` in the deployment
   * stack. Creating the certificate here instead would make every deploy of
   * this stack sit and wait while someone adds a validation CNAME at the
   * external DNS provider, and time out if they don't. Issuing it once out of
   * band and importing the ARN keeps `cdk deploy` non-interactive.
   */
  certificateArn: z.string(),
  /**
   * Origins allowed to load these assets. Module scripts are always fetched in
   * CORS mode, so an origin missing here cannot boot the app at all — list every
   * host the SPA is served from.
   */
  allowedOrigins: z.array(z.string()).min(1),
  /**
   * Roles the release pipeline assumes to upload. Granted through the bucket
   * policy rather than by mutating a role this stack does not own.
   */
  uploaderRoleArns: z.array(z.string()).default([]),
  /** How long an asset outlives the last build that referenced it. */
  retentionDays: z.number().int().positive().default(30),
});

type ArgosAssetsStackOwnProps = z.infer<typeof ArgosAssetsStackPropsSchema>;

interface ArgosAssetsStackProps
  extends cdk.StackProps, ArgosAssetsStackOwnProps {}

/**
 * Origin for the frontend's content-hashed assets.
 *
 * The app runs as several ECS tasks behind an ALB, and each task can only serve
 * the build baked into its own image. While a rolling deploy is in flight, a
 * shell served by a new task names chunks the old tasks do not have, and once
 * the old tasks are gone any tab still holding an older shell can never load
 * another lazy route. Both are the same bug: asset lifetime was tied to
 * container lifetime.
 *
 * This bucket unties them. It is append-only across deploys — every recent
 * build's chunks stay reachable, so it does not matter which task answered, and
 * rolling back to an older image keeps working. Space is reclaimed out of band
 * by the purge function below, never by a deploy.
 */
export class ArgosAssetsStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: ArgosAssetsStackProps) {
    super(scope, id, props);

    const {
      stage,
      domainName,
      certificateArn,
      allowedOrigins,
      uploaderRoleArns,
      retentionDays,
    } = props;
    const isProduction = stage === "production";

    // ----------------------------------------------------------------
    // S3 Bucket — append-only store of every recent build's assets
    // ----------------------------------------------------------------
    // Not versioned: object names are content hashes, so a key's contents can
    // never change and there is no prior version to keep.
    this.bucket = new s3.Bucket(this, "AssetsBucket", {
      bucketName: `argos-assets-${stage}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
    });

    if (uploaderRoleArns.length > 0) {
      const uploaders = uploaderRoleArns.map(
        (arn) => new iam.ArnPrincipal(arn),
      );
      // `aws s3 sync` reads before it writes, to skip objects already present.
      this.bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          principals: uploaders,
          actions: ["s3:GetObject", "s3:PutObject"],
          resources: [`${this.bucket.bucketArn}/*`],
        }),
      );
      this.bucket.addToResourcePolicy(
        new iam.PolicyStatement({
          principals: uploaders,
          actions: ["s3:ListBucket"],
          resources: [this.bucket.bucketArn],
        }),
      );
    }

    // ----------------------------------------------------------------
    // ACM Certificate — imported, see `certificateArn` on the props
    // ----------------------------------------------------------------
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      certificateArn,
    );

    // ----------------------------------------------------------------
    // CloudFront — path-only cache key, everything immutable
    // ----------------------------------------------------------------
    const cachePolicy = new cloudfront.CachePolicy(this, "CachePolicy", {
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      minTtl: cdk.Duration.days(1),
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
    });

    // The upload stamps `Cache-Control: public, max-age=31536000, immutable` on
    // the objects themselves, so only CORS is added here. Response headers
    // policies are evaluated per request rather than stored with the cached
    // object, which is why the cache key above can stay path-only even though
    // the allowed origin is echoed back.
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "ResponseHeadersPolicy",
      {
        corsBehavior: {
          accessControlAllowCredentials: false,
          accessControlAllowHeaders: ["*"],
          accessControlAllowMethods: ["GET", "HEAD", "OPTIONS"],
          accessControlAllowOrigins: allowedOrigins,
          originOverride: true,
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              // Not required today — the app leaves COEP off — but it costs
              // nothing and keeps these assets loadable if it is ever turned on.
              header: "Cross-Origin-Resource-Policy",
              value: "cross-origin",
              override: true,
            },
          ],
        },
      },
    );

    // Note: with origin access control the bucket grants only `s3:GetObject`,
    // so S3 answers a missing key with 403 rather than 404. That is expected,
    // not a permissions fault.
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy,
        responseHeadersPolicy,
        compress: true,
      },
      domainNames: [domainName],
      certificate,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    // No Route 53 records here: `argos-ci.com` is not hosted in this account.
    // `domainName` has to be pointed at `DistributionDomainName` (below) with a
    // CNAME at whoever runs that zone, once, by hand.

    // ----------------------------------------------------------------
    // Retention — daily, driven by build manifests rather than object age
    // ----------------------------------------------------------------
    const purgeFn = new nodejs.NodejsFunction(this, "PurgeFn", {
      entry: path.join(__dirname, "../lambda/purge-assets.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_24_X,
      memorySize: 512,
      // Listing and deleting tens of thousands of keys is paginated, and this
      // runs once a day with nothing waiting on it.
      timeout: cdk.Duration.minutes(15),
      logGroup: new cdk.aws_logs.LogGroup(this, "PurgeFnLogGroup", {
        retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      }),
      environment: {
        BUCKET: this.bucket.bucketName,
        RETENTION_DAYS: String(retentionDays),
      },
      bundling: {
        minify: true,
        sourceMap: false,
        target: "es2022",
      },
    });

    this.bucket.grantReadWrite(purgeFn);

    new events.Rule(this, "PurgeSchedule", {
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
      targets: [new targets.LambdaFunction(purgeFn)],
    });

    // ----------------------------------------------------------------
    // Outputs
    // ----------------------------------------------------------------
    new cdk.CfnOutput(this, "BucketName", { value: this.bucket.bucketName });
    new cdk.CfnOutput(this, "AssetsBaseUrl", {
      value: `https://${domainName}`,
    });
    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
    });
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: `CNAME target for ${domainName}. Create this record at the external DNS provider for the zone; nothing serves until it exists.`,
    });
  }
}
