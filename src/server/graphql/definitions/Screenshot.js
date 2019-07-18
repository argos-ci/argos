import gql from 'graphql-tag'

export const typeDefs = gql`
  type Screenshot {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    s3Id: ID!
  }
`
