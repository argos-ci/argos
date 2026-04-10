#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { ArgosStorybookStack } from "../lib/storybook-stack.js";

const app = new cdk.App();

const stage = app.node.tryGetContext("stage") ?? "development";

new ArgosStorybookStack(app, `argos-storybook-${stage}`, {
  stage,
  env: {
    account: process.env["CDK_DEFAULT_ACCOUNT"],
    region: "eu-west-1",
  },
});

app.synth();
