import type { components } from "@octokit/openapi-types";

export * from "./auth.js";
export * from "./client.js";
export * from "./comment.js";

export type GhApiRepository = components["schemas"]["repository"];
export type GhApiInstallation = components["schemas"]["installation"];
