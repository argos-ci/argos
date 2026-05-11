import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

export interface ArgosReplicaStackProps extends cdk.StackProps {
  stage: "production";
}

export class ArgosReplicaStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ArgosReplicaStackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, "ReplicaBucket", {
      bucketName: `argos-deployments-${props.stage}-replica`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, "ReplicaBucketName", {
      value: this.bucket.bucketName,
    });
    new cdk.CfnOutput(this, "ReplicaBucketArn", {
      value: this.bucket.bucketArn,
    });
  }
}
