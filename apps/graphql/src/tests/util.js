import express from "express";

export const createApolloServerApp = async (apolloServer, { user } = {}) => {
  const app = express();
  app.use((req, res, next) => {
    req.user = user;
    next();
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  return app;
};
