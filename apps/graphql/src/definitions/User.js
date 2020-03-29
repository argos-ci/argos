import gql from 'graphql-tag'

export const typeDefs = gql`
  type User {
    id: ID!
    email: String
    login: String!
    name: String
    privateSync: Boolean!
    installations: [Installation!]!
    latestSynchronization: Synchronization
  }

  extend type Query {
    "Get the authenticated user"
    user: User
  }
`

export const resolvers = {
  Query: {
    async user(user, args, context) {
      return context.user || null
    },
  },
  User: {
    async installations(user) {
      return user.$relatedQuery('installations')
    },
    async latestSynchronization(user) {
      return user.$relatedQuery('synchronizations').first()
    },
  },
}
