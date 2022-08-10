import { makeExecutableSchema } from "@graphql-tools/schema";
import { definitions } from "./definitions";

const schemaDefinition = {
  typeDefs: definitions.map((def) => def.typeDefs).filter(Boolean),
  resolvers: definitions.map((def) => def.resolvers).filter(Boolean),
};

export const schema = makeExecutableSchema(schemaDefinition);
