import type { NamespaceSchema, ProjectSchema } from "@gitbeaker/rest";

export * from "./auth.js";
export * from "./client.js";
export * from "./util.js";

export type GlApiNamespace = NamespaceSchema;
export type GlApiProject = ProjectSchema;
