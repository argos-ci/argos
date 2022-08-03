import gql from 'graphql-tag'
import { Purchase } from '@argos-ci/database/models'

export const typeDefs = gql`
  type Purchase {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    planId: ID!
    accountId: ID!
  }

  extend type Query {
    "Get a purchase"
    purchase(id: String!): Purchase
    accountPurchases(id: String!): [Purchase!]!
    planPurchases(id: String!): [Purchase!]!
  }
`

export const resolvers = {
  Query: {
    async purchase(rootObj, { id }) {
      const purchase = await Purchase.findById(id)
      return purchase || null
    },
    async accountPurchases(rootObj, { id }) {
      return Purchase.query().where({ accountId: id })
    },
    async planPurchases(rootObj, { id }) {
      return Purchase.query().where({ planId: id })
    },
  },
}
