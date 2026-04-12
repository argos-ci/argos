import * as cdk from "aws-cdk-lib";

import { ArgosDeploymentStack } from "../lib/deployment-stack.ts";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") ?? "development";
const hostedZoneId = app.node.tryGetContext("hostedZoneId");
const deploymentDomain = app.node.tryGetContext("deploymentDomain");

if (!hostedZoneId) {
  throw new Error(
    "Missing required context: hostedZoneId. Pass it with -c hostedZoneId=<id>",
  );
}
if (!deploymentDomain) {
  throw new Error(
    "Missing required context: deploymentDomain. Pass it with -c deploymentDomain=<domain>",
  );
}

const devUserArns = (app.node.tryGetContext("devUserArns") ?? "")
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

new ArgosDeploymentStack(app, `argos-deployment-${stage}`, {
  stage,
  hostedZoneId,
  deploymentDomain,
  devUserArns,
  env: {
    account: process.env["CDK_DEFAULT_ACCOUNT"],
    region: "us-east-1",
  },
});

app.synth();
