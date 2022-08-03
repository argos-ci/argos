import gql from 'graphql-tag'
import { Plan } from '@argos-ci/database/models'

export const typeDefs = gql`
  type Plan {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    "Screenshots quota for the month"
    screenshotsQuota: Int!
    githubId: ID!
  }

  extend type Query {
    "Get a plan"
    plan(id: String!): Plan
    "Get all plans"
    plans: [Plan!]!
  }
`

export const resolvers = {
  Query: {
    async plan(rootObj, { id }) {
      const plan = await Plan.findById(id)
      return plan || null
    },
    async plans() {
      return Plan.query()
    },
  },
}
