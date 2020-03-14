import gql from 'graphql-tag'

export const typeDefs = gql`
  type Synchronization {
    id: ID!
    jobStatus: JobStatus!
    type: String!
  }
`
