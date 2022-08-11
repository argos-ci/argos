import express from "express";

export const createTestApp = (...middlewares) => {
  const app = express();
  app.use(
    ...middlewares,
    (_req, res) => {
      res.sendStatus(200);
    },
    // eslint-disable-next-line no-unused-vars
    (_err, _req, res, _next) => {
      if (_err.statusCode) {
        res.status(_err.statusCode);
      }

      res.send(_err.message);
    }
  );
  return app;
};
