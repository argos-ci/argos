import {
  GraphQLDate,
  GraphQLDateTime,
  GraphQLJSONObject,
  GraphQLTime,
  GraphQLTimestamp,
} from "graphql-scalars";
import gqlTag from "graphql-tag";

import type { IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  scalar Date
  scalar DateTime
  scalar Time
  scalar Timestamp
  scalar JSONObject
`;

export const resolvers: IResolvers = {
  Date: GraphQLDate,
  DateTime: GraphQLDateTime,
  Time: GraphQLTime,
  Timestamp: GraphQLTimestamp,
  JSONObject: GraphQLJSONObject,
};
