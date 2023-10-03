import { Handlers } from "@sentry/node";
import express, { Router, static as serveStatic } from "express";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import config from "@/config/index.js";
import { apolloServer, createApolloMiddleware } from "@/graphql/index.js";

import { auth } from "./middlewares/auth.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { rendering } from "./middlewares/rendering.js";
import { middleware as vercel } from "./vercel.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const installAppRouter = async (app: express.Application) => {
  const production = config.get("env") === "production";

  const router = Router();

  // Static directory
  router.use(
    "/static/app",
    serveStatic(join(__dirname, "../../../frontend/dist"), {
      etag: true,
      lastModified: false,
      maxAge: "1 year",
      index: false,
    }),
  );

  router.use(auth);

  router.get("/auth/logout", (req, res) => {
    // @ts-ignore
    req.logout();
    if (config.get("env") !== "production") {
      res.redirect("/");
    } else {
      res.redirect("https://www.argos-ci.com/");
    }
  });

  router.use(vercel);

  await apolloServer.start();
  router.use("/graphql", express.json(), createApolloMiddleware());

  router.get("*", rendering());

  const htmlErrorHandler: express.ErrorRequestHandler = (
    err,
    req,
    res,
    next,
  ) => {
    rendering({
      error: {
        statusCode: res.statusCode,
        message: production ? "" : err.message,
        stack: production ? "" : err.stack,
      },
    })(req, res, next);
  };

  router.use(Handlers.errorHandler());

  router.use(
    errorHandler({
      formatters: {
        html: htmlErrorHandler,
        default: htmlErrorHandler,
      },
    }),
  );

  app.use(router);
};
