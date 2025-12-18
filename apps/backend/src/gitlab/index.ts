import type { NamespaceSchema, ProjectSchema } from "@gitbeaker/rest";

export * from "./auth";
export * from "./client";
export * from "./util";

/** @public */
export type GlApiNamespace = NamespaceSchema;
/** @public */
export type GlApiProject = ProjectSchema;
