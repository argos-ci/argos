import { createDocument, ZodOpenApiObject } from "zod-openapi";

import config from "@/config";

import { addCommentReactionOperation } from "./handlers/addCommentReaction";
import { createBuildOperation } from "./handlers/createBuild";
import { createCommentOperation } from "./handlers/createComment";
import { createDeploymentOperation } from "./handlers/createDeployment";
import { createReviewOperation } from "./handlers/createReview";
import { deleteCommentOperation } from "./handlers/deleteComment";
import { dismissReviewOperation } from "./handlers/dismissReview";
import { exchangeCliTokenOperation } from "./handlers/exchangeCliToken";
import { exchangeGitHubActionsOidcTokenOperation } from "./handlers/exchangeGitHubActionsOidcToken";
import { exchangeGitHubActionsTokenlessTokenOperation } from "./handlers/exchangeGitHubActionsTokenlessToken";
import { finalizeBuildsOperation } from "./handlers/finalizeBuilds";
import { finalizeDeploymentOperation } from "./handlers/finalizeDeployment";
import { findBaselineOperation } from "./handlers/findBaseline";
import { getAuthProjectOperation } from "./handlers/getAuthProject";
import { getBuildOperation } from "./handlers/getBuild";
import { getBuildDiffsOperation } from "./handlers/getBuildDiffs";
import { getCommentOperation } from "./handlers/getComment";
import { getDeploymentOperation } from "./handlers/getDeployment";
import { getProjectOperation } from "./handlers/getProject";
import { getProjectBuildsOperation } from "./handlers/getProjectBuilds";
import { listCommentsOperation } from "./handlers/listComments";
import { listReviewsOperation } from "./handlers/listReviews";
import { removeCommentReactionOperation } from "./handlers/removeCommentReaction";
import {
  resolveCommentThreadOperation,
  unresolveCommentThreadOperation,
} from "./handlers/resolveCommentThread";
import { resolveDeploymentDomainOperation } from "./handlers/resolveDeploymentDomain";
import {
  subscribeCommentThreadOperation,
  unsubscribeCommentThreadOperation,
} from "./handlers/subscribeCommentThread";
import { updateBuildOperation } from "./handlers/updateBuild";
import { updateCommentOperation } from "./handlers/updateComment";

export const zodSchema = {
  openapi: "3.2.0",
  info: {
    title: "Argos API",
    version: "2.0.0",
    contact: {
      name: "Argos Support",
      url: "https://argos-ci.com",
      email: "contact@argos-ci.com",
    },
    termsOfService: "https://argos-ci.com/terms",
  },
  externalDocs: {
    description: "Argos API reference",
    url: "https://argos-ci.com/docs/api-reference",
  },
  servers: [
    {
      url: `${config.get("api.baseUrl")}/v2`,
      description: "API Endpoint",
    },
  ],
  tags: [
    {
      name: "Authentication",
      description:
        "Exchange CI and CLI credentials for an Argos project token. Use these endpoints to obtain the bearer token that authenticates every other request.",
      "x-page-icon": "key",
    },
    {
      name: "Projects",
      description:
        "Retrieve project metadata, either by slug or for the project tied to the current token.",
      "x-page-icon": "folder-open",
    },
    {
      name: "Builds",
      description:
        "Create, finalize, update, and inspect visual testing builds, including their screenshot diffs. This is the core of the visual testing workflow.",
      "x-page-icon": "images",
    },
    {
      name: "Reviews",
      description:
        "Submit, list, and dismiss reviews to approve or reject the changes captured in a build.",
      "x-page-icon": "clipboard-check",
    },
    {
      name: "Comments",
      description:
        "Collaborate on builds with threaded comments: post and edit comments, react with emojis, resolve threads, and manage notification subscriptions.",
      "x-page-icon": "comments",
    },
    {
      name: "Deployments",
      description:
        "Create, finalize, and resolve deployments to publish and serve project artifacts.",
      "x-page-icon": "rocket",
    },
  ],
  components: {
    securitySchemes: {
      projectToken: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Project Token",
        description: [
          "Authenticate as a **project** with a project token.",
          "",
          "Send it as a bearer token in the `Authorization` header:",
          "",
          "```http",
          "Authorization: Bearer <project-token>",
          "```",
          "",
          "You can find your project token in your Argos project settings.",
          "Project tokens are used by CI and the SDK to create builds and",
          "deployments.",
        ].join("\n"),
      },
      personalAccessToken: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Personal Access Token",
        description: [
          "Authenticate as a **user** with a personal access token.",
          "",
          "Send it as a bearer token in the `Authorization` header:",
          "",
          "```http",
          "Authorization: Bearer <personal-access-token>",
          "```",
          "",
          "Personal access tokens act on behalf of the user that created them",
          "and are required by endpoints that perform user actions, such as",
          "reviewing builds and posting comments.",
        ].join("\n"),
      },
    },
  },
  security: [{ projectToken: [] }],
  paths: {
    "/builds": {
      post: createBuildOperation,
    },
    "/deployments": {
      post: createDeploymentOperation,
    },
    "/deployments/{deploymentId}": {
      get: getDeploymentOperation,
    },
    "/deployments/{deploymentId}/finalize": {
      post: finalizeDeploymentOperation,
    },
    "/deployments/resolve/{domain}": {
      get: resolveDeploymentDomainOperation,
    },
    "/builds/finalize": {
      post: finalizeBuildsOperation,
    },
    "/baseline": {
      post: findBaselineOperation,
    },
    "/auth/cli/token": {
      post: exchangeCliTokenOperation,
    },
    "/auth/github-actions/oidc/exchange": {
      post: exchangeGitHubActionsOidcTokenOperation,
    },
    "/auth/github-actions/tokenless/exchange": {
      post: exchangeGitHubActionsTokenlessTokenOperation,
    },
    "/project": {
      get: getAuthProjectOperation,
    },
    "/builds/{buildId}": {
      put: updateBuildOperation,
    },
    "/projects/{owner}/{project}": {
      get: getProjectOperation,
    },
    "/projects/{owner}/{project}/builds": {
      get: getProjectBuildsOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}": {
      get: getBuildOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/diffs": {
      get: getBuildDiffsOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/reviews": {
      get: listReviewsOperation,
      post: createReviewOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/reviews/{reviewId}/dismiss":
      {
        post: dismissReviewOperation,
      },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments": {
      get: listCommentsOperation,
      post: createCommentOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}": {
      get: getCommentOperation,
      patch: updateCommentOperation,
      delete: deleteCommentOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/reactions":
      {
        post: addCommentReactionOperation,
        delete: removeCommentReactionOperation,
      },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/resolve":
      {
        post: resolveCommentThreadOperation,
      },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/unresolve":
      {
        post: unresolveCommentThreadOperation,
      },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/subscription":
      {
        post: subscribeCommentThreadOperation,
        delete: unsubscribeCommentThreadOperation,
      },
  },
} satisfies ZodOpenApiObject;

export const schema: ReturnType<typeof createDocument> =
  createDocument(zodSchema);
