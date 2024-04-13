import express from "express";

export const createTestApp = (
  ...middlewares: (express.RequestHandler | express.RequestHandler[])[]
) => {
  const app = express();
  app.use(
    ...middlewares,
    ((_req, res) => {
      res.sendStatus(503);
    }) as express.RequestHandler,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ((_err, _req, res, _next) => {
      if (_err.statusCode) {
        res.status(_err.statusCode);
      }

      res.send(_err.message);
    }) as express.ErrorRequestHandler,
  );
  return app;
};
