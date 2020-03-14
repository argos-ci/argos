import gql from 'graphql-tag'

export const typeDefs = gql`
  enum Permission {
    read
    write
  }
`
