import { ScreenshotMetadataJSONSchema } from "@argos/schemas/screenshot-metadata";
import cors from "cors";
import { Router } from "express";
import { stringify } from "yaml";

import {
  cancelAccountInvite,
  createAccountInvites,
  listAccountInvites,
  resetAccountInviteLink,
} from "./handlers/accountInvites";
import { addCommentReaction } from "./handlers/addCommentReaction";
import {
  createAutomationRule,
  deactivateAutomationRule,
  getAutomationRule,
  listAutomationRules,
  updateAutomationRule,
} from "./handlers/automationRules";
import {
  addBuildReviewers,
  listBuildReviewers,
  removeBuildReviewers,
} from "./handlers/buildReviewers";
import { createBuild } from "./handlers/createBuild";
import { createComment } from "./handlers/createComment";
import { createDeployment } from "./handlers/createDeployment";
import { createProject } from "./handlers/createProject";
import { createReview } from "./handlers/createReview";
import { deleteComment } from "./handlers/deleteComment";
import { dismissReview } from "./handlers/dismissReview";
import { exchangeCliToken } from "./handlers/exchangeCliToken";
import { exchangeGitHubActionsOidcToken } from "./handlers/exchangeGitHubActionsOidcToken";
import { exchangeGitHubActionsTokenlessToken } from "./handlers/exchangeGitHubActionsTokenlessToken";
import { finalizeBuilds } from "./handlers/finalizeBuilds";
import { finalizeDeployment } from "./handlers/finalizeDeployment";
import { findBaseline } from "./handlers/findBaseline";
import { getAccount, updateAccount } from "./handlers/getAccount";
import { getAccountAnalytics } from "./handlers/getAccountAnalytics";
import { getAuthProject } from "./handlers/getAuthProject";
import { getBuild } from "./handlers/getBuild";
import { getComment } from "./handlers/getComment";
import { getDeployment } from "./handlers/getDeployment";
import { getMe } from "./handlers/getMe";
import { getProject } from "./handlers/getProject";
import { getTest } from "./handlers/getTest";
import { ignoreChange, unignoreChange } from "./handlers/ignoreChange";
import { listAccountMembers } from "./handlers/listAccountMembers";
import { listBuildDiffs } from "./handlers/listBuildDiffs";
import { listBuilds } from "./handlers/listBuilds";
import { listComments } from "./handlers/listComments";
import { listIgnoredChanges } from "./handlers/listIgnoredChanges";
import { listProjects } from "./handlers/listProjects";
import { listReviews } from "./handlers/listReviews";
import { listTestChanges } from "./handlers/listTestChanges";
import { listTests } from "./handlers/listTests";
import {
  createMediaHandler,
  deleteMediaHandler,
  finalizeMediaHandler,
  getMediaHandler,
  listMediaHandler,
  listMediaVersionsHandler,
  updateMediaHandler,
} from "./handlers/media";
import {
  listProjectContributors,
  removeProjectContributorHandler,
  setProjectContributor,
} from "./handlers/projectContributors";
import {
  getProjectDomain,
  listProjectDeployments,
  updateProjectDomain,
} from "./handlers/projectDeployments";
import { removeCommentReaction } from "./handlers/removeCommentReaction";
import {
  resolveCommentThread,
  unresolveCommentThread,
} from "./handlers/resolveCommentThread";
import { resolveDeploymentDomain } from "./handlers/resolveDeploymentDomain";
import {
  subscribeBuild,
  subscribeTest,
  unsubscribeBuild,
  unsubscribeTest,
} from "./handlers/subscribeBuild";
import {
  subscribeCommentThread,
  unsubscribeCommentThread,
} from "./handlers/subscribeCommentThread";
import {
  addTeamDomainHandler,
  listTeamDomainsHandler,
  removeTeamDomainHandler,
} from "./handlers/teamDomains";
import { transferProject } from "./handlers/transferProject";
import {
  removeAccountMember,
  setAccountMemberLevel,
} from "./handlers/updateAccountMember";
import { updateBuild } from "./handlers/updateBuild";
import { updateComment } from "./handlers/updateComment";
import { updateProject } from "./handlers/updateProject";
import { schema } from "./schema";
import { errorHandler, registerHandler } from "./util";

const router: Router = Router();

// CORS

router.get("/screenshot-metadata.json", (_req, res) => {
  res.json(ScreenshotMetadataJSONSchema);
});

// Expose the OpenAPI schema as YAML
router.get(
  "/openapi.yaml",
  cors({
    // Allow the Swagger editor to access the OpenAPI schema
    origin: ["https://editor.swagger.io", "https://editor-next.swagger.io"],
  }),
  (_req, res) => {
    res.set("Content-Type", "text/yaml");
    const yamlSchema = stringify(schema, {
      aliasDuplicateObjects: false,
    });
    res.send(yamlSchema);
  },
);

// Register the handlers.
registerHandler(router, createBuild);
registerHandler(router, createProject);
registerHandler(router, createReview);
registerHandler(router, listReviews);
registerHandler(router, dismissReview);
registerHandler(router, listComments);
registerHandler(router, createComment);
registerHandler(router, getComment);
registerHandler(router, updateComment);
registerHandler(router, deleteComment);
registerHandler(router, addCommentReaction);
registerHandler(router, removeCommentReaction);
registerHandler(router, resolveCommentThread);
registerHandler(router, unresolveCommentThread);
registerHandler(router, subscribeCommentThread);
registerHandler(router, unsubscribeCommentThread);
registerHandler(router, exchangeCliToken);
registerHandler(router, exchangeGitHubActionsOidcToken);
registerHandler(router, exchangeGitHubActionsTokenlessToken);
registerHandler(router, createDeployment);
registerHandler(router, finalizeBuilds);
registerHandler(router, findBaseline);
registerHandler(router, finalizeDeployment);
registerHandler(router, getDeployment);
registerHandler(router, getAccountAnalytics);
registerHandler(router, getMe);
registerHandler(router, getAuthProject);
registerHandler(router, getBuild);
registerHandler(router, listBuildDiffs);
registerHandler(router, ignoreChange);
registerHandler(router, unignoreChange);
registerHandler(router, getProject);
registerHandler(router, getTest);
registerHandler(router, listTestChanges);
registerHandler(router, listBuilds);
registerHandler(router, listProjects);
registerHandler(router, resolveDeploymentDomain);
registerHandler(router, updateBuild);
registerHandler(router, listAccountMembers);
registerHandler(router, setAccountMemberLevel);
registerHandler(router, removeAccountMember);
registerHandler(router, listAccountInvites);
registerHandler(router, createAccountInvites);
registerHandler(router, cancelAccountInvite);
registerHandler(router, resetAccountInviteLink);
registerHandler(router, updateProject);
registerHandler(router, transferProject);
registerHandler(router, listTests);
registerHandler(router, listIgnoredChanges);
registerHandler(router, listBuildReviewers);
registerHandler(router, addBuildReviewers);
registerHandler(router, removeBuildReviewers);
registerHandler(router, subscribeBuild);
registerHandler(router, unsubscribeBuild);
registerHandler(router, subscribeTest);
registerHandler(router, unsubscribeTest);
registerHandler(router, getAccount);
registerHandler(router, updateAccount);
registerHandler(router, listProjectContributors);
registerHandler(router, setProjectContributor);
registerHandler(router, removeProjectContributorHandler);
registerHandler(router, listAutomationRules);
registerHandler(router, getAutomationRule);
registerHandler(router, createAutomationRule);
registerHandler(router, updateAutomationRule);
registerHandler(router, deactivateAutomationRule);
registerHandler(router, listProjectDeployments);
registerHandler(router, getProjectDomain);
registerHandler(router, updateProjectDomain);
registerHandler(router, listTeamDomainsHandler);
registerHandler(router, addTeamDomainHandler);
registerHandler(router, removeTeamDomainHandler);
registerHandler(router, createMediaHandler);
registerHandler(router, finalizeMediaHandler);
registerHandler(router, getMediaHandler);
registerHandler(router, deleteMediaHandler);
registerHandler(router, updateMediaHandler);
registerHandler(router, listMediaHandler);
registerHandler(router, listMediaVersionsHandler);

// Error handlers
router.use(errorHandler);

export { router as openAPIRouter };
