import express from "express";
import path from "path";
import session from "express-session";
import connectRedis from "connect-redis";
import config from "@argos-ci/config";
import * as Sentry from "@sentry/node";
import { apolloServer } from "@argos-ci/graphql";
import { errorHandler } from "./middlewares/errorHandler";
import { rendering } from "./middlewares/rendering";
import { auth } from "./middlewares/auth";
import * as redis from "./redis";

export const createAppRouter = async () => {
  const production = config.get("env") === "production";

  const router = express.Router();
  const RedisStore = connectRedis(session);

  // Static directory
  router.use(
    "/static/app",
    express.static(path.join(__dirname, "../../app/dist"), {
      etag: true,
      lastModified: false,
      maxAge: "1 year",
      index: false,
    })
  );

  router.use(
    session({
      secret: config.get("server.sessionSecret"),
      store: new RedisStore({ client: redis.connect() }),
      cookie: {
        secure: config.get("server.secure"),
        httpOnly: true,
        maxAge: 2592000000, // 30 days
      },
      // Touch is supported by the Redis store.
      // No need to resave, we can avoid concurrency issues.
      resave: false,
      saveUninitialized: false,
    })
  );

  router.use(auth);

  await apolloServer.start();
  apolloServer.applyMiddleware({ app: router });

  router.get("/auth/logout", (req, res) => {
    req.logout();
    if (config.get("env") !== "production") {
      res.redirect("/");
    } else {
      res.redirect("https://www.argos-ci.com/");
    }
  });

  router.get("*", rendering());

  const htmlErrorHandler = (err, req, res, next) => {
    rendering({
      error: {
        statusCode: res.statusCode,
        message: production ? "" : err.message,
        stack: production ? "" : err.stack,
      },
    })(req, res, next);
  };

  router.use(Sentry.Handlers.errorHandler());

  router.use(
    errorHandler({
      formatters: {
        html: htmlErrorHandler,
        default: htmlErrorHandler,
      },
    })
  );

  return router;
};
