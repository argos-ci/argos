import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { z } from "zod";

export const ArgosPublicFilesStackPropsSchema = z
  .object({
    stage: z.enum(["development", "production"]),
    /**
     * Host the public files are served from, e.g. `public.argos-ci.com`.
     * Without one, the distribution's own `*.cloudfront.net` name serves
     * them.
     */
    domainName: z.string().optional(),
    /**
     * ACM certificate for `domainName`, issued in us-east-1 and validated once
     * by hand, for the reason given on the assets stack: `argos-ci.com` is not
     * a Route 53 zone.
     */
    certificateArn: z.string().optional(),
    /**
     * Origins the app is served from. The browser uploads files straight to
     * the bucket, so an origin missing here cannot upload any.
     */
    allowedOrigins: z.array(z.string()).min(1),
    /**
     * IAM identities the app signs its S3 requests with: the user behind the
     * production access keys, the developers running it locally. Granted
     * through the bucket policy rather than by changing identities this stack
     * does not own.
     */
    appPrincipalArns: z.array(z.string()).min(1),
  })
  .refine(
    (props) => Boolean(props.domainName) === Boolean(props.certificateArn),
    { message: "`domainName` and `certificateArn` go together" },
  );

type ArgosPublicFilesStackOwnProps = z.infer<
  typeof ArgosPublicFilesStackPropsSchema
>;

interface ArgosPublicFilesStackProps
  extends cdk.StackProps, ArgosPublicFilesStackOwnProps {}

/**
 * The bucket behind `apps/backend/src/storage/public-files.ts`, whose doc
 * describes the flow: browser uploads land in `uploads/`, and only `public/`,
 * which the app writes, is served.
 */
export class ArgosPublicFilesStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: ArgosPublicFilesStackProps) {
    super(scope, id, props);

    const {
      stage,
      domainName,
      certificateArn,
      allowedOrigins,
      appPrincipalArns,
    } = props;
    const isProduction = stage === "production";

    this.bucket = new s3.Bucket(this, "Bucket", {
      bucketName: `argos-public-files-${stage}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
      // A presigned POST is a simple request: no preflight, but the browser
      // still drops the response, and with it the upload's outcome, unless
      // S3 answers with the origin.
      cors: [
        {
          allowedMethods: [s3.HttpMethods.POST],
          allowedOrigins,
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          // The app deletes an upload once it has read it. This only catches
          // the ones nobody finished: a closed tab, a failed request.
          prefix: "uploads/",
          expiration: cdk.Duration.days(1),
        },
      ],
    });

    const appPrincipals = appPrincipalArns.map(
      (arn) => new iam.ArnPrincipal(arn),
    );
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: appPrincipals,
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [`${this.bucket.bucketArn}/*`],
      }),
    );
    // Without it S3 answers a missing key with 403 instead of 404, and the app
    // cannot tell an upload that never happened from a permission fault.
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: appPrincipals,
        actions: ["s3:ListBucket"],
        resources: [this.bucket.bucketArn],
      }),
    );

    const certificate = certificateArn
      ? acm.Certificate.fromCertificateArn(this, "Certificate", certificateArn)
      : undefined;

    // Keys are random and never rewritten, so a cached file never goes
    // stale: replacing one writes a new key.
    const cachePolicy = new cloudfront.CachePolicy(this, "CachePolicy", {
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      minTtl: cdk.Duration.days(1),
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
    });

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "ResponseHeadersPolicy",
      {
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy: "default-src 'none'; frame-ancestors 'none'",
            override: true,
          },
          contentTypeOptions: { override: true },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.days(365),
            includeSubdomains: true,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: "Cross-Origin-Resource-Policy",
              value: "cross-origin",
              override: true,
            },
          ],
        },
      },
    );

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        // Reads only under `public/`: `/avatars/<file>.png` maps to
        // `public/avatars/<file>.png`, and no URL reaches `uploads/`.
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
          originPath: "/public",
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy,
        responseHeadersPolicy,
      },
      ...(domainName && certificate
        ? { domainNames: [domainName], certificate }
        : {}),
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    new cdk.CfnOutput(this, "BucketName", { value: this.bucket.bucketName });
    new cdk.CfnOutput(this, "PublicFilesBaseUrl", {
      value: `https://${domainName ?? this.distribution.distributionDomainName}/`,
      description: "PUBLIC_FILES_BASE_URL for the app.",
    });
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: domainName
        ? `CNAME target for ${domainName}. Create this record at the external DNS provider for the zone; nothing serves until it exists.`
        : "Serves the public files.",
    });
  }
}
