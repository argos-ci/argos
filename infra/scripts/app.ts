import * as cdk from "aws-cdk-lib";

import { ArgosDeploymentStack } from "../lib/deployment-stack.ts";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") ?? "development";
const hostedZoneId = app.node.tryGetContext("hostedZoneId");

if (!hostedZoneId) {
  throw new Error(
    "Missing required context: hostedZoneId. Pass it with -c hostedZoneId=<id>",
  );
}

new ArgosDeploymentStack(app, `argos-deployment-${stage}`, {
  stage,
  hostedZoneId,
  env: {
    account: process.env["CDK_DEFAULT_ACCOUNT"],
    region: "us-east-1",
  },
});

app.synth();
