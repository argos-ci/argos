import express from "express";

let started = false;

export const createApolloServerApp = async (apolloServer, { user } = {}) => {
  const app = express();
  app.use((req, res, next) => {
    req.user = user;
    next();
  });

  if (!started) {
    await apolloServer.start();
  }
  started = true;
  apolloServer.applyMiddleware({ app });

  return app;
};
