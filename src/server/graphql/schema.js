import merge from 'merge-deep'
import { concatenateTypeDefs, makeExecutableSchema } from 'graphql-tools'
import { parse } from 'graphql/language'
import { definitions } from './definitions'

const schemaDefinition = {
  typeDefs: parse(
    concatenateTypeDefs(definitions.map(def => def.typeDefs).filter(Boolean)),
  ),
  resolvers: merge(...definitions.map(def => def.resolvers)),
}

export const schema = makeExecutableSchema(schemaDefinition)
