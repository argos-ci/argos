import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import config from "./config";

import "./index.css";

import { invariant } from "@argos/util/invariant";

if (process.env["NODE_ENV"] === "production") {
  Sentry.init({
    dsn: config.get("sentry.clientDsn"),
    environment: config.get("sentry.environment"),
    release: config.get("releaseVersion"),
  });
}

const container = document.querySelector("#root");
invariant(container, "No #root element found");

const root = createRoot(container);
root.render(<App />);
