import { createDocument, ZodOpenApiObject } from "zod-openapi";

import config from "@/config";
import { isMcpEligible } from "@/mcp/eligibility";
import { getMcpResourceUrl } from "@/oauth/metadata";

import {
  addBuildCommentReactionOperation,
  addTestCommentReactionOperation,
} from "./handlers/addCommentReaction";
import { createBuildOperation } from "./handlers/createBuild";
import {
  createBuildCommentOperation,
  createTestCommentOperation,
} from "./handlers/createComment";
import { createDeploymentOperation } from "./handlers/createDeployment";
import { createProjectOperation } from "./handlers/createProject";
import { createReviewOperation } from "./handlers/createReview";
import {
  deleteBuildCommentOperation,
  deleteTestCommentOperation,
} from "./handlers/deleteComment";
import { dismissReviewOperation } from "./handlers/dismissReview";
import { exchangeCliTokenOperation } from "./handlers/exchangeCliToken";
import { exchangeGitHubActionsOidcTokenOperation } from "./handlers/exchangeGitHubActionsOidcToken";
import { exchangeGitHubActionsTokenlessTokenOperation } from "./handlers/exchangeGitHubActionsTokenlessToken";
import { finalizeBuildsOperation } from "./handlers/finalizeBuilds";
import { finalizeDeploymentOperation } from "./handlers/finalizeDeployment";
import { findBaselineOperation } from "./handlers/findBaseline";
import { getAccountAnalyticsOperation } from "./handlers/getAccountAnalytics";
import { getAuthProjectOperation } from "./handlers/getAuthProject";
import { getBuildOperation } from "./handlers/getBuild";
import {
  getBuildCommentOperation,
  getTestCommentOperation,
} from "./handlers/getComment";
import { getDeploymentOperation } from "./handlers/getDeployment";
import { getMeOperation } from "./handlers/getMe";
import { getProjectOperation } from "./handlers/getProject";
import { getTestOperation } from "./handlers/getTest";
import {
  ignoreChangeOperation,
  unignoreChangeOperation,
} from "./handlers/ignoreChange";
import { listBuildDiffsOperation } from "./handlers/listBuildDiffs";
import { listBuildsOperation } from "./handlers/listBuilds";
import {
  listBuildCommentsOperation,
  listTestCommentsOperation,
} from "./handlers/listComments";
import { listProjectsOperation } from "./handlers/listProjects";
import { listReviewsOperation } from "./handlers/listReviews";
import { listTestChangesOperation } from "./handlers/listTestChanges";
import {
  removeBuildCommentReactionOperation,
  removeTestCommentReactionOperation,
} from "./handlers/removeCommentReaction";
import {
  resolveBuildCommentThreadOperation,
  resolveTestCommentThreadOperation,
  unresolveBuildCommentThreadOperation,
  unresolveTestCommentThreadOperation,
} from "./handlers/resolveCommentThread";
import { resolveDeploymentDomainOperation } from "./handlers/resolveDeploymentDomain";
import {
  subscribeBuildCommentThreadOperation,
  subscribeTestCommentThreadOperation,
  unsubscribeBuildCommentThreadOperation,
  unsubscribeTestCommentThreadOperation,
} from "./handlers/subscribeCommentThread";
import { updateBuildOperation } from "./handlers/updateBuild";
import {
  updateBuildCommentOperation,
  updateTestCommentOperation,
} from "./handlers/updateComment";
import { securitySchemes } from "./security";

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
  // Advertise the MCP server to GitBook and other tooling reading the spec;
  // per-operation availability is stamped via `x-gitbook-mcp`.
  "x-gitbook-mcp-url": getMcpResourceUrl(),
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
      name: "Users",
      description:
        "Retrieve information about the user authenticated by the current personal access token.",
      "x-page-icon": "user",
    },
    {
      name: "Projects",
      description:
        "Retrieve project metadata, either by slug or for the project tied to the current token.",
      "x-page-icon": "folder-open",
    },
    {
      name: "Analytics",
      description:
        "Retrieve account-level build and screenshot metrics over time.",
      "x-page-icon": "chart-no-axes-combined",
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
      name: "Tests",
      description:
        "Inspect a test's flakiness — how often it changed and how erratically — list the changes that keep coming back, and ignore the ones that are only noise.",
      "x-page-icon": "flask",
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
    securitySchemes,
  },
  security: [{ projectToken: [] }],
  paths: {
    "/accounts/{accountSlug}/analytics": {
      get: getAccountAnalyticsOperation,
    },
    "/accounts/{accountSlug}/projects": {
      get: listProjectsOperation,
    },
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
    "/me": {
      get: getMeOperation,
    },
    "/project": {
      get: getAuthProjectOperation,
    },
    "/builds/{buildId}": {
      put: updateBuildOperation,
    },
    "/projects": {
      post: createProjectOperation,
    },
    "/projects/{owner}/{project}": {
      get: getProjectOperation,
    },
    "/projects/{owner}/{project}/builds": {
      get: listBuildsOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}": {
      get: getBuildOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/diffs": {
      get: listBuildDiffsOperation,
    },
    "/projects/{owner}/{project}/changes/{changeId}/ignore": {
      post: ignoreChangeOperation,
    },
    "/projects/{owner}/{project}/changes/{changeId}/unignore": {
      post: unignoreChangeOperation,
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
      get: listBuildCommentsOperation,
      post: createBuildCommentOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}": {
      get: getBuildCommentOperation,
      patch: updateBuildCommentOperation,
      delete: deleteBuildCommentOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/reactions":
      {
        post: addBuildCommentReactionOperation,
        delete: removeBuildCommentReactionOperation,
      },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/resolve":
      {
        post: resolveBuildCommentThreadOperation,
      },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/unresolve":
      {
        post: unresolveBuildCommentThreadOperation,
      },
    "/projects/{owner}/{project}/builds/{buildNumber}/comments/{commentId}/subscription":
      {
        post: subscribeBuildCommentThreadOperation,
        delete: unsubscribeBuildCommentThreadOperation,
      },
    "/projects/{owner}/{project}/tests/{testId}": {
      get: getTestOperation,
    },
    "/projects/{owner}/{project}/tests/{testId}/changes": {
      get: listTestChangesOperation,
    },
    "/projects/{owner}/{project}/tests/{testId}/comments": {
      get: listTestCommentsOperation,
      post: createTestCommentOperation,
    },
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}": {
      get: getTestCommentOperation,
      patch: updateTestCommentOperation,
      delete: deleteTestCommentOperation,
    },
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/reactions":
      {
        post: addTestCommentReactionOperation,
        delete: removeTestCommentReactionOperation,
      },
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/resolve": {
      post: resolveTestCommentThreadOperation,
    },
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/unresolve":
      {
        post: unresolveTestCommentThreadOperation,
      },
    "/projects/{owner}/{project}/tests/{testId}/comments/{commentId}/subscription":
      {
        post: subscribeTestCommentThreadOperation,
        delete: unsubscribeTestCommentThreadOperation,
      },
  },
} satisfies ZodOpenApiObject;

/**
 * Stamp `x-gitbook-mcp` on every operation exposed on the MCP server. The
 * marker is *computed* from each operation's declared `security` (the same
 * predicate the MCP server derives its tools from), never set by hand, so the
 * published OpenAPI document can't get out of sync with the MCP tool surface.
 */
function markMcpOperations(
  document: ReturnType<typeof createDocument>,
): ReturnType<typeof createDocument> {
  const methods = ["get", "post", "put", "patch", "delete"] as const;
  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const method of methods) {
      const operation = pathItem[method];
      if (operation && isMcpEligible(operation)) {
        Object.assign(operation, { "x-gitbook-mcp": true });
      }
    }
  }
  return document;
}

export const schema: ReturnType<typeof createDocument> = markMcpOperations(
  createDocument(zodSchema),
);
