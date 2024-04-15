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
      if (_err.statusCode || _err.status) {
        res.status(_err.statusCode || _err.status);
      } else {
        res.status(500);
      }

      res.send(_err.message);
    }) as express.ErrorRequestHandler,
  );
  return app;
};
