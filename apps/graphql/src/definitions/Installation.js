import gql from 'graphql-tag'

export const typeDefs = gql`
  type Installation {
    id: ID!
    latestSynchronization: Synchronization
  }
`

export const resolvers = {
  Installation: {
    async latestSynchronization(installation) {
      return installation.$relatedQuery('synchronizations').first()
    },
  },
}
