import express from 'express'

export function createApolloServerApp(apolloServer, { user } = {}) {
  const app = express()
  app.use((req, res, next) => {
    req.user = user
    next()
  })

  apolloServer.applyMiddleware({ app })

  return app
}
