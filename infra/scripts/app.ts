import * as cdk from "aws-cdk-lib";

import { ArgosDeploymentStack } from "../lib/deployment-stack.ts";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") ?? "development";
const hostedZoneId = app.node.tryGetContext("hostedZoneId");
const apiBaseUrl =
  process.env["API_BASEURL"] ??
  app.node.tryGetContext("apiBaseUrl") ??
  (stage === "production"
    ? "https://api.argos-ci.com"
    : "https://foal-great-publicly.ngrok-free.app");

if (!hostedZoneId) {
  throw new Error(
    "Missing required context: hostedZoneId. Pass it with -c hostedZoneId=<id>",
  );
}

const devUserArns = (app.node.tryGetContext("devUserArns") ?? "")
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

new ArgosDeploymentStack(app, `argos-deployment-${stage}`, {
  stage,
  hostedZoneId,
  apiBaseUrl,
  devUserArns,
  env: {
    account: process.env["CDK_DEFAULT_ACCOUNT"],
    region: "us-east-1",
  },
});

app.synth();
