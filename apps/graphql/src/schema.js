import { makeExecutableSchema } from "@graphql-tools/schema";

import { definitions } from "./definitions";

export const schema = makeExecutableSchema({
  typeDefs: definitions.map((def) => def.typeDefs).filter(Boolean),
  resolvers: definitions.map((def) => def.resolvers).filter(Boolean),
  inheritResolversFromInterfaces: true,
});
