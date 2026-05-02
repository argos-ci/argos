import { execFileSync } from "node:child_process";
import * as cdk from "aws-cdk-lib";

import {
  ArgosDeploymentStack,
  ArgosDeploymentStackPropsSchema,
} from "../lib/deployment-stack.ts";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage");
const source = app.node.tryGetContext("source");

if (!stage) {
  throw new Error(`Missing required context value: stage`);
}

function get1PasswordItemName(stage: string) {
  const itemByStage: Record<string, string> = {
    production: "argos-prod",
    development: "argos-dev",
  };

  const item = itemByStage[stage];

  if (!item) {
    throw new Error(
      `No 1Password config item mapped for stage "${stage}". Known stages: ${Object.keys(
        itemByStage,
      ).join(", ")}`,
    );
  }

  return item;
}

function read1PasswordConfig(stage: string) {
  const item = get1PasswordItemName(stage);

  const json = execFileSync("op", ["read", `op://${item}/cdk/config.json`], {
    encoding: "utf8",
  });

  const config = JSON.parse(json);

  if (config.stage !== stage) {
    throw new Error(
      `Stage mismatch: context stage is "${stage}" but 1Password config stage is "${config.stage}"`,
    );
  }

  return config;
}

const rawProps =
  source === "1P"
    ? read1PasswordConfig(stage)
    : {
        stage,
        apiBaseUrl: app.node.tryGetContext("apiBaseUrl"),
        appUrl: app.node.tryGetContext("appUrl"),
        hostedZoneId: app.node.tryGetContext("hostedZoneId"),
        accessTokenSecret: app.node.tryGetContext("accessTokenSecret"),
        appUserArns: (app.node.tryGetContext("appUserArns") ?? "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
      };

const props = ArgosDeploymentStackPropsSchema.parse(rawProps);

new ArgosDeploymentStack(app, `argos-deployment-${props.stage}`, {
  ...props,
  env: {
    account: process.env["CDK_DEFAULT_ACCOUNT"],
    region: "us-east-1",
  },
});

app.synth();
