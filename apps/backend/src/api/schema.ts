import { createDocument, ZodOpenApiObject } from "zod-openapi";

import config from "@/config";
import { isMcpEligible } from "@/mcp/eligibility";
import { getMcpResourceUrl } from "@/oauth/metadata";

import {
  cancelAccountInviteOperation,
  createAccountInvitesOperation,
  listAccountInvitesOperation,
  resetAccountInviteLinkOperation,
} from "./handlers/accountInvites";
import {
  addBuildCommentReactionOperation,
  addMediaCommentReactionOperation,
  addTestCommentReactionOperation,
} from "./handlers/addCommentReaction";
import {
  createAutomationRuleOperation,
  deactivateAutomationRuleOperation,
  getAutomationRuleOperation,
  listAutomationRulesOperation,
  updateAutomationRuleOperation,
} from "./handlers/automationRules";
import {
  addBuildReviewersOperation,
  listBuildReviewersOperation,
  removeBuildReviewersOperation,
} from "./handlers/buildReviewers";
import { createBuildOperation } from "./handlers/createBuild";
import {
  createBuildCommentOperation,
  createMediaCommentOperation,
  createTestCommentOperation,
} from "./handlers/createComment";
import { createDeploymentOperation } from "./handlers/createDeployment";
import { createProjectOperation } from "./handlers/createProject";
import { createReviewOperation } from "./handlers/createReview";
import {
  deleteBuildCommentOperation,
  deleteMediaCommentOperation,
  deleteTestCommentOperation,
} from "./handlers/deleteComment";
import { dismissReviewOperation } from "./handlers/dismissReview";
import { exchangeGitHubActionsOidcTokenOperation } from "./handlers/exchangeGitHubActionsOidcToken";
import { exchangeGitHubActionsTokenlessTokenOperation } from "./handlers/exchangeGitHubActionsTokenlessToken";
import { finalizeBuildsOperation } from "./handlers/finalizeBuilds";
import { finalizeDeploymentOperation } from "./handlers/finalizeDeployment";
import { findBaselineOperation } from "./handlers/findBaseline";
import {
  getAccountOperation,
  updateAccountOperation,
} from "./handlers/getAccount";
import { getAccountAnalyticsOperation } from "./handlers/getAccountAnalytics";
import { getAuthProjectOperation } from "./handlers/getAuthProject";
import { getBuildOperation } from "./handlers/getBuild";
import {
  getBuildCommentOperation,
  getMediaCommentOperation,
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
import { listAccountMembersOperation } from "./handlers/listAccountMembers";
import { listBuildDiffsOperation } from "./handlers/listBuildDiffs";
import { listBuildsOperation } from "./handlers/listBuilds";
import {
  listBuildCommentsOperation,
  listMediaCommentsOperation,
  listTestCommentsOperation,
} from "./handlers/listComments";
import { listIgnoredChangesOperation } from "./handlers/listIgnoredChanges";
import { listProjectEventsOperation } from "./handlers/listProjectEvents";
import { listProjectsOperation } from "./handlers/listProjects";
import { listReviewsOperation } from "./handlers/listReviews";
import { listTestChangesOperation } from "./handlers/listTestChanges";
import { listTestsOperation } from "./handlers/listTests";
import {
  createMediaOperation,
  deleteMediaOperation,
  finalizeMediaOperation,
  getMediaOperation,
  listMediaOperation,
  listMediaVersionsOperation,
  updateMediaOperation,
} from "./handlers/media";
import {
  listProjectContributorsOperation,
  removeProjectContributorOperation,
  setProjectContributorOperation,
} from "./handlers/projectContributors";
import {
  getProjectDomainOperation,
  listProjectDeploymentsOperation,
  updateProjectDomainOperation,
} from "./handlers/projectDeployments";
import {
  createAccountProjectTokenOperation,
  createProjectTokenOperation,
  deleteAccountProjectTokenOperation,
  deleteProjectTokenOperation,
  listAccountProjectTokensOperation,
  listProjectTokensOperation,
} from "./handlers/projectTokens";
import {
  removeBuildCommentReactionOperation,
  removeMediaCommentReactionOperation,
  removeTestCommentReactionOperation,
} from "./handlers/removeCommentReaction";
import {
  resolveBuildCommentThreadOperation,
  resolveMediaCommentThreadOperation,
  resolveTestCommentThreadOperation,
  unresolveBuildCommentThreadOperation,
  unresolveMediaCommentThreadOperation,
  unresolveTestCommentThreadOperation,
} from "./handlers/resolveCommentThread";
import { resolveDeploymentDomainOperation } from "./handlers/resolveDeploymentDomain";
import {
  subscribeBuildOperation,
  subscribeTestOperation,
  unsubscribeBuildOperation,
  unsubscribeTestOperation,
} from "./handlers/subscribeBuild";
import {
  subscribeBuildCommentThreadOperation,
  subscribeMediaCommentThreadOperation,
  subscribeTestCommentThreadOperation,
  unsubscribeBuildCommentThreadOperation,
  unsubscribeMediaCommentThreadOperation,
  unsubscribeTestCommentThreadOperation,
} from "./handlers/subscribeCommentThread";
import {
  addTeamDomainOperation,
  listTeamDomainsOperation,
  removeTeamDomainOperation,
} from "./handlers/teamDomains";
import { transferProjectOperation } from "./handlers/transferProject";
import {
  removeAccountMemberOperation,
  setAccountMemberLevelOperation,
} from "./handlers/updateAccountMember";
import { updateBuildOperation } from "./handlers/updateBuild";
import {
  updateBuildCommentOperation,
  updateMediaCommentOperation,
  updateTestCommentOperation,
} from "./handlers/updateComment";
import { updateProjectOperation } from "./handlers/updateProject";
import {
  createAccountWebhookOperation,
  deleteAccountWebhookOperation,
  getAccountWebhookOperation,
  getWebhookDeliveryOperation,
  listAccountWebhooksOperation,
  listWebhookDeliveriesOperation,
  resendWebhookDeliveryOperation,
} from "./handlers/webhooks";
import { securitySchemes } from "./security";
import { webhooks } from "./webhooks";

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
  // GitBook builds the reference's navigation from these tags, in this order,
  // nesting each one under its `parent`. A group with no description shows
  // its children as cards. `x-page-icon` is a Font Awesome icon name, the set
  // GitBook renders, not a Lucide one like the frontend uses: GitBook shows an
  // unknown name as a placeholder.
  tags: [
    { name: "Visual testing", "x-page-icon": "eye" },
    {
      name: "Builds",
      parent: "Visual testing",
      description:
        "Create, finalize, update, and inspect visual testing builds, including their screenshot diffs. This is the core of the visual testing workflow.",
      "x-page-icon": "images",
    },
    {
      name: "Reviews",
      parent: "Visual testing",
      description:
        "Submit, list, and dismiss reviews to approve or reject the changes captured in a build, and request reviewers.",
      "x-page-icon": "clipboard-check",
    },
    {
      name: "Tests",
      parent: "Visual testing",
      description:
        "Inspect a test's flakiness (how often it changed and how erratically), list the changes that keep coming back, and ignore the ones that are only noise.",
      "x-page-icon": "flask",
    },
    {
      name: "Comments",
      parent: "Visual testing",
      description:
        "Discuss builds, tests and media in threaded comments: post and edit comments, react with emojis, resolve threads, and manage notification subscriptions.",
      "x-page-icon": "comments",
    },
    { name: "Projects & teams", "x-page-icon": "building" },
    {
      name: "Projects",
      parent: "Projects & teams",
      description:
        "Create, configure and transfer projects, and choose who contributes to them.",
      "x-page-icon": "folder-open",
    },
    {
      name: "Tokens",
      parent: "Projects & teams",
      description:
        "Manage the project tokens CI authenticates with. A project can have several, so a token is rotated without downtime: create its replacement, update the CI secret, then revoke the old one.",
      "x-page-icon": "key-skeleton",
    },
    {
      name: "Accounts",
      parent: "Projects & teams",
      description:
        "Get the user behind your token and the accounts it reaches, read an account's plan and usage, and set the role people join a team with.",
      "x-page-icon": "circle-user",
    },
    {
      name: "Members",
      parent: "Projects & teams",
      description:
        "Manage who is on a team and what they can reach: list members, change their role, remove them, send or cancel invitations, and open the team to an email domain.",
      "x-page-icon": "users",
    },
    {
      name: "Analytics",
      parent: "Projects & teams",
      description:
        "Retrieve account-level build and screenshot metrics over time.",
      "x-page-icon": "chart-mixed",
    },
    { name: "Integrations", "x-page-icon": "plug" },
    {
      name: "Events",
      parent: "Integrations",
      description:
        "Follow what happens in your projects: builds completing and getting reviewed, deployments created and ready. Read them from the events feed, or receive each one on a webhook set up in your account settings.",
      "x-page-icon": "bolt",
    },
    {
      name: "Webhooks",
      parent: "Integrations",
      description:
        "Manage the webhooks Argos posts your projects' events to, look into their deliveries and resend one that failed.",
      "x-page-icon": "webhook",
    },
    {
      name: "Automations",
      parent: "Integrations",
      description:
        "Run actions when a build event matches your conditions: post to Slack, Microsoft Teams or Discord when a build completes or is reviewed.",
      "x-page-icon": "diagram-project",
    },
    {
      name: "Deployments",
      description:
        "Create, finalize, and resolve deployments to publish and serve project artifacts.",
      "x-page-icon": "rocket",
    },
    {
      name: "Media",
      description:
        "Upload standalone images and videos, with no build or test run behind them, and get back a shareable URL plus ready-to-paste Markdown. Built for embedding a screenshot or a screen recording in the pull request an agent just opened.",
      "x-page-icon": "photo-film",
    },
    {
      name: "Authentication",
      description:
        "Exchange CI and CLI credentials for an Argos project token. Use these endpoints to obtain the bearer token that authenticates every other request.",
      "x-page-icon": "key",
    },
  ],
  components: {
    securitySchemes,
  },
  security: [{ projectToken: [] }],
  paths: {
    "/accounts/{accountSlug}": {
      get: getAccountOperation,
      patch: updateAccountOperation,
    },
    "/accounts/{accountSlug}/analytics": {
      get: getAccountAnalyticsOperation,
    },
    "/accounts/{accountSlug}/projects": {
      get: listProjectsOperation,
    },
    "/accounts/{accountSlug}/members": {
      get: listAccountMembersOperation,
    },
    "/accounts/{accountSlug}/members/{userId}": {
      patch: setAccountMemberLevelOperation,
      delete: removeAccountMemberOperation,
    },
    "/accounts/{accountSlug}/invites": {
      get: listAccountInvitesOperation,
      post: createAccountInvitesOperation,
    },
    "/accounts/{accountSlug}/invites/{inviteId}": {
      delete: cancelAccountInviteOperation,
    },
    "/accounts/{accountSlug}/domains": {
      get: listTeamDomainsOperation,
      post: addTeamDomainOperation,
    },
    "/accounts/{accountSlug}/domains/{domain}": {
      delete: removeTeamDomainOperation,
    },
    "/accounts/{accountSlug}/project-tokens": {
      get: listAccountProjectTokensOperation,
      post: createAccountProjectTokenOperation,
    },
    "/accounts/{accountSlug}/project-tokens/{tokenId}": {
      delete: deleteAccountProjectTokenOperation,
    },
    "/accounts/{accountSlug}/webhooks": {
      get: listAccountWebhooksOperation,
      post: createAccountWebhookOperation,
    },
    "/accounts/{accountSlug}/webhooks/{webhookId}": {
      get: getAccountWebhookOperation,
      delete: deleteAccountWebhookOperation,
    },
    "/accounts/{accountSlug}/webhooks/{webhookId}/deliveries": {
      get: listWebhookDeliveriesOperation,
    },
    "/accounts/{accountSlug}/webhooks/{webhookId}/deliveries/{deliveryId}": {
      get: getWebhookDeliveryOperation,
    },
    "/accounts/{accountSlug}/webhooks/{webhookId}/deliveries/{deliveryId}/resend":
      {
        post: resendWebhookDeliveryOperation,
      },
    "/accounts/{accountSlug}/invite-link/reset": {
      post: resetAccountInviteLinkOperation,
    },
    "/media": {
      post: createMediaOperation,
    },
    "/media/{mediaId}": {
      patch: updateMediaOperation,
      get: getMediaOperation,
      delete: deleteMediaOperation,
    },
    "/media/{mediaId}/versions": {
      get: listMediaVersionsOperation,
    },
    "/media/{mediaId}/finalize": {
      post: finalizeMediaOperation,
    },
    "/media/{mediaId}/comments": {
      get: listMediaCommentsOperation,
      post: createMediaCommentOperation,
    },
    "/media/{mediaId}/comments/{commentId}": {
      get: getMediaCommentOperation,
      patch: updateMediaCommentOperation,
      delete: deleteMediaCommentOperation,
    },
    "/media/{mediaId}/comments/{commentId}/reactions": {
      post: addMediaCommentReactionOperation,
      delete: removeMediaCommentReactionOperation,
    },
    "/media/{mediaId}/comments/{commentId}/resolve": {
      post: resolveMediaCommentThreadOperation,
    },
    "/media/{mediaId}/comments/{commentId}/unresolve": {
      post: unresolveMediaCommentThreadOperation,
    },
    "/media/{mediaId}/comments/{commentId}/subscription": {
      post: subscribeMediaCommentThreadOperation,
      delete: unsubscribeMediaCommentThreadOperation,
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
      patch: updateProjectOperation,
    },
    "/projects/{owner}/{project}/automation-rules": {
      get: listAutomationRulesOperation,
      post: createAutomationRuleOperation,
    },
    "/projects/{owner}/{project}/automation-rules/{ruleId}": {
      get: getAutomationRuleOperation,
      put: updateAutomationRuleOperation,
    },
    "/projects/{owner}/{project}/automation-rules/{ruleId}/deactivate": {
      post: deactivateAutomationRuleOperation,
    },
    "/projects/{owner}/{project}/contributors": {
      get: listProjectContributorsOperation,
    },
    "/projects/{owner}/{project}/contributors/{userId}": {
      put: setProjectContributorOperation,
      delete: removeProjectContributorOperation,
    },
    "/projects/{owner}/{project}/tokens": {
      get: listProjectTokensOperation,
      post: createProjectTokenOperation,
    },
    "/projects/{owner}/{project}/tokens/{tokenId}": {
      delete: deleteProjectTokenOperation,
    },
    "/projects/{owner}/{project}/transfer": {
      post: transferProjectOperation,
    },
    "/projects/{owner}/{project}/media": {
      get: listMediaOperation,
    },
    "/projects/{owner}/{project}/builds": {
      get: listBuildsOperation,
    },
    "/projects/{owner}/{project}/events": {
      get: listProjectEventsOperation,
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
    "/projects/{owner}/{project}/builds/{buildNumber}/reviewers": {
      get: listBuildReviewersOperation,
      post: addBuildReviewersOperation,
      delete: removeBuildReviewersOperation,
    },
    "/projects/{owner}/{project}/builds/{buildNumber}/subscription": {
      post: subscribeBuildOperation,
      delete: unsubscribeBuildOperation,
    },
    "/projects/{owner}/{project}/tests/{testId}/subscription": {
      post: subscribeTestOperation,
      delete: unsubscribeTestOperation,
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
    "/projects/{owner}/{project}/tests": {
      get: listTestsOperation,
    },
    "/projects/{owner}/{project}/deployments": {
      get: listProjectDeploymentsOperation,
    },
    "/projects/{owner}/{project}/domain": {
      get: getProjectDomainOperation,
      put: updateProjectDomainOperation,
    },
    "/projects/{owner}/{project}/ignored-changes": {
      get: listIgnoredChangesOperation,
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
  webhooks,
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
