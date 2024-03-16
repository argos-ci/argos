import type { NamespaceSchema, ProjectSchema } from "@gitbeaker/rest";

export * from "./auth.js";
export * from "./client.js";
export * from "./util.js";

/** @public */
export type GlApiNamespace = NamespaceSchema;
/** @public */
export type GlApiProject = ProjectSchema;
