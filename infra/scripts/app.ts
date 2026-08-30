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

if (!stage) {
  throw new Error(`Missing required context value: stage`);
}

function assertStageMatches(config: { stage?: string }, stage: string) {
  if (config.stage !== stage) {
    throw new Error(
      `Stage mismatch: context stage is "${stage}" but the loaded config stage is "${config.stage}"`,
    );
  }
}

/**
 * The stack props for a stage, read from SSM Parameter Store.
 *
 * The only source, and deliberately so. There used to be three — a 1Password
 * item for local deploys, this parameter for CI, and a pile of `-c` flags for
 * throwaway synths — which meant the same document existed in two places and
 * had to be edited in both. It drifted: the development item was still missing
 * the `assets` block long after the assets stack shipped, so a local deploy
 * failed on a document CI had been reading correctly for months. One copy, and
 * every stage reaches it the same way.
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

const rawProps = readSsmConfig(stage);

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
//
// Only where the config describes one. Development serves the frontend from
// Vite and has no asset CDN, so requiring an `assets` block there would mean
// inventing a domain name and an ACM ARN for a stack nobody deploys.
const assetsConfig = rawProps.assets ?? null;

// Production is the case where a missing block is a mistake rather than a
// choice: dropping it would silently take a live distribution out of the app,
// and `cdk deploy --all` would stop managing it without ever failing.
if (props.stage === "production" && !assetsConfig) {
  throw new Error(
    "Missing `assets` in the production config: refusing to synth without the assets stack.",
  );
}

if (assetsConfig) {
  const assetsProps = ArgosAssetsStackPropsSchema.parse({
    stage: props.stage,
    ...assetsConfig,
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
}

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
