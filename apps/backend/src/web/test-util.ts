import express from "express";
import type { UnhandledFrameHandle } from "msw";
import { HttpNetworkFrame } from "msw/experimental";

export const createTestApp = (
  ...middlewares: (express.RequestHandler | express.RequestHandler[])[]
): express.Express => {
  const app = express();
  app.use(
    ...middlewares,
    ((_req, res) => {
      res.sendStatus(503);
    }) as express.RequestHandler,
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

/**
 * MSW `onUnhandledFrame` that fails requests no handler answers, except the
 * ones supertest sends to the app under test through the loopback interface.
 */
export const failUnhandledExceptLoopback: UnhandledFrameHandle = ({
  frame,
  defaults,
}) => {
  if (
    frame instanceof HttpNetworkFrame &&
    new URL(frame.data.request.url).hostname === "127.0.0.1"
  ) {
    return;
  }
  defaults.error();
};
