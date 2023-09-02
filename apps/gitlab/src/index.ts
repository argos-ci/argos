export * from "./auth.js";
export * from "./client.js";

import type { NamespaceSchema, ProjectSchema } from "@gitbeaker/rest";

export type GlApiNamespace = NamespaceSchema;
export type GlApiProject = ProjectSchema;
