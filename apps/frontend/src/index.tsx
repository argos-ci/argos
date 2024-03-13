import { init as initSentry } from "@sentry/browser";

import "core-js";

import { createRoot } from "react-dom/client";

import { App } from "./App";
import config from "./config";

import "./index.css";

import { invariant } from "@apollo/client/utilities/globals";

if (process.env["NODE_ENV"] === "production") {
  initSentry({
    dsn: config.get("sentry.clientDsn"),
    environment: config.get("sentry.environment"),
    release: config.get("releaseVersion"),
  });
}

const container = document.querySelector("#root");
invariant(container, "No #root element found");

const root = createRoot(container);
root.render(<App />);
