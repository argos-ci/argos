import type { components } from "@octokit/openapi-types";

export * from "./auth.js";
export * from "./client.js";
export * from "./comment.js";

/** @public */
export type GhApiRepository = components["schemas"]["repository"];
/** @public */
export type GhApiInstallation = components["schemas"]["installation"];
