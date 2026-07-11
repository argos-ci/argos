import { ScreenshotMetadataJSONSchema } from "@argos/schemas/screenshot-metadata";
import cors from "cors";
import { Router } from "express";
import { stringify } from "yaml";

import { addCommentReaction } from "./handlers/addCommentReaction";
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
import { getAccountAnalytics } from "./handlers/getAccountAnalytics";
import { getAuthProject } from "./handlers/getAuthProject";
import { getBuild } from "./handlers/getBuild";
import { getBuildDiffs } from "./handlers/getBuildDiffs";
import { getComment } from "./handlers/getComment";
import { getDeployment } from "./handlers/getDeployment";
import { getMe } from "./handlers/getMe";
import { getProject } from "./handlers/getProject";
import { getProjectBuilds } from "./handlers/getProjectBuilds";
import { listComments } from "./handlers/listComments";
import { listReviews } from "./handlers/listReviews";
import { removeCommentReaction } from "./handlers/removeCommentReaction";
import {
  resolveCommentThread,
  unresolveCommentThread,
} from "./handlers/resolveCommentThread";
import { resolveDeploymentDomain } from "./handlers/resolveDeploymentDomain";
import {
  subscribeCommentThread,
  unsubscribeCommentThread,
} from "./handlers/subscribeCommentThread";
import { updateBuild } from "./handlers/updateBuild";
import { updateComment } from "./handlers/updateComment";
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
registerHandler(router, getBuildDiffs);
registerHandler(router, getProject);
registerHandler(router, getProjectBuilds);
registerHandler(router, resolveDeploymentDomain);
registerHandler(router, updateBuild);

// Error handlers
router.use(errorHandler);

export { router as openAPIRouter };
