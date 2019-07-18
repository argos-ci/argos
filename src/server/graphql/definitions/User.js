import gql from 'graphql-tag'
import { SCOPES } from 'server/constants'
import APIError from 'server/graphql/APIError'
import User from 'server/models/User'

export const typeDefs = gql`
  type User {
    id: ID!
    relatedRepositories: [Repository!]!
  }

  input UsurpUserInput {
    email: String!
  }

  extend type Query {
    "Get the authenticated user"
    user: User
  }

  extend type Mutation {
    "Can be used to usurp a user"
    usurpUser(input: UsurpUserInput!): User!
  }
`

export const resolvers = {
  User: {
    async relatedRepositories(user) {
      const repositories = await user
        .$relatedQuery('relatedRepositories')
        .eager('[organization, user]')

      // Sorting using database doesn't work, probably an objection issue.
      // Eager is breaking it.
      return repositories.sort((a, b) =>
        `${(a.organization || a.user).login}${a.name}` >
        `${(b.organization || b.user).login}${b.name}`
          ? 1
          : -1,
      )
    },
  },
  Query: {
    async user(rootObj, args, context) {
      return context.user || null
    },
  },
  Mutation: {
    async usurpUser(rootObj, args, context) {
      if (!context.user) {
        throw new APIError('Invalid user identification')
      }

      if (!context.user.scopes.includes(SCOPES.superAdmin)) {
        throw new APIError('Invalid user authorization')
      }

      const user = await User.query()
        .where({ email: args.input.email })
        .limit(1)
        .first()

      if (!user) {
        throw new APIError('Wrong email')
      }

      await new Promise((resolve, reject) => {
        context.login(user, err => {
          if (err) {
            reject(err)
            return
          }

          resolve()
        })
      })

      return user
    },
  },
}
