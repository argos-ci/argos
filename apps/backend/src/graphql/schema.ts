import { makeExecutableSchema } from "@graphql-tools/schema";
import type { DocumentNode } from "graphql";

import { definitions } from "./definitions/index.js";

export const schema = makeExecutableSchema({
  typeDefs: definitions
    .map((def) => def.typeDefs)
    .filter(Boolean) as DocumentNode[],
  resolvers: definitions.map((def) => def.resolvers).filter(Boolean) as any,
  inheritResolversFromInterfaces: true,
});
