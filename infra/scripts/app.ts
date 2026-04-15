import * as cdk from "aws-cdk-lib";

import {
  ArgosDeploymentStack,
  ArgosDeploymentStackPropsSchema,
} from "../lib/deployment-stack.ts";

const app = new cdk.App();

const props = ArgosDeploymentStackPropsSchema.parse({
  stage: app.node.tryGetContext("stage"),
  apiBaseUrl: app.node.tryGetContext("apiBaseUrl"),
  hostedZoneId: app.node.tryGetContext("hostedZoneId"),
  devUserArns: (app.node.tryGetContext("devUserArns") ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean),
});

new ArgosDeploymentStack(app, `argos-deployment-${props.stage}`, {
  ...props,
  env: {
    account: process.env["CDK_DEFAULT_ACCOUNT"],
    region: "us-east-1",
  },
});

app.synth();
