import type { components } from "@octokit/openapi-types";

export * from "./auth";
export * from "./client";
export * from "./comment";

/** @public */
export type GhApiRepository = components["schemas"]["repository"];
/** @public */
export type GhApiInstallation = components["schemas"]["installation"];
