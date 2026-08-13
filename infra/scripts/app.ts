import { execFileSync } from "node:child_process";
import * as cdk from "aws-cdk-lib";

import {
  ArgosAssetsStack,
  ArgosAssetsStackPropsSchema,
} from "../lib/assets-stack.ts";
import {
  ArgosDeploymentStack,
  ArgosDeploymentStackPropsSchema,
} from "../lib/deployment-stack.ts";
import { ArgosReplicaStack } from "../lib/replica-stack.ts";

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

function assertStageMatches(config: { stage?: string }, stage: string) {
  if (config.stage !== stage) {
    throw new Error(
      `Stage mismatch: context stage is "${stage}" but the loaded config stage is "${config.stage}"`,
    );
  }
}

function read1PasswordConfig(stage: string) {
  const item = get1PasswordItemName(stage);

  const json = execFileSync("op", ["read", `op://${item}/cdk/config.json`], {
    encoding: "utf8",
  });

  const config = JSON.parse(json);

  assertStageMatches(config, stage);

  return config;
}

/**
 * The same config document, read from SSM Parameter Store instead of 1Password.
 *
 * CI has no `op` binary and no way to authenticate one, so the parameter is the
 * automation-facing copy of the 1Password item. `release.yml` already reads
 * `/production/*` parameters for the ECS task definitions, so the mechanism and
 * the role's permissions are established.
 */
function readSsmConfig(stage: string) {
  const json = execFileSync(
    "aws",
    [
      "ssm",
      "get-parameter",
      "--name",
      `/${stage}/cdk/config.json`,
      "--with-decryption",
      "--query",
      "Parameter.Value",
      "--output",
      "text",
    ],
    { encoding: "utf8" },
  );

  const config = JSON.parse(json);

  assertStageMatches(config, stage);

  return config;
}

/** Reads a comma-separated context value as a list. */
function getContextList(name: string): string[] {
  return (app.node.tryGetContext(name) ?? "")
    .split(",")
    .map((value: string) => value.trim())
    .filter(Boolean);
}

const rawProps =
  source === "1P"
    ? read1PasswordConfig(stage)
    : source === "ssm"
      ? readSsmConfig(stage)
      : {
          stage,
          apiBaseUrl: app.node.tryGetContext("apiBaseUrl"),
          appUrl: app.node.tryGetContext("appUrl"),
          hostedZoneId: app.node.tryGetContext("hostedZoneId"),
          accessTokenSecret: app.node.tryGetContext("accessTokenSecret"),
          appUserArns: getContextList("appUserArns"),
          assets: {
            domainName: app.node.tryGetContext("assetsDomainName"),
            // Imported, not created: unlike `argos-ci.live` above, the app's
            // own domain is not a Route 53 zone in this account.
            certificateArn: app.node.tryGetContext("assetsCertificateArn"),
            allowedOrigins: getContextList("assetsAllowedOrigins"),
            uploaderRoleArns: getContextList("assetsUploaderRoleArns"),
          },
        };

const props = ArgosDeploymentStackPropsSchema.parse(rawProps);

const deploymentStack = new ArgosDeploymentStack(
  app,
  `argos-deployment-${props.stage}`,
  {
    ...props,
    env: {
      account: process.env["CDK_DEFAULT_ACCOUNT"],
      region: "us-east-1",
    },
  },
);

// Independent of the deployment stack: this one serves Argos's own frontend,
// that one serves customer deployments. Kept separate so a release, which
// touches only the asset bucket, never has to update the deployment stack.
const assetsProps = ArgosAssetsStackPropsSchema.parse({
  stage: props.stage,
  ...rawProps.assets,
});

new ArgosAssetsStack(app, `argos-assets-${props.stage}`, {
  ...assetsProps,
  env: {
    account: process.env["CDK_DEFAULT_ACCOUNT"],
    // Must be us-east-1: CloudFront only accepts an ACM certificate issued
    // there, whatever region the distribution serves from.
    region: "us-east-1",
  },
});

if (props.stage === "production") {
  const replicaStack = new ArgosReplicaStack(
    app,
    `argos-deployment-${props.stage}-replica`,
    {
      stage: props.stage,
      env: {
        account: process.env["CDK_DEFAULT_ACCOUNT"],
        region: "eu-west-1",
      },
    },
  );
  deploymentStack.addDependency(replicaStack);
}

app.synth();
