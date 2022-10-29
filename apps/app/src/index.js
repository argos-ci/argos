import "core-js";
import { createRoot } from "react-dom/client";
import { init as initSentry } from "@sentry/browser";
import config from "./config";
import { App } from "./App";

if (process.env.NODE_ENV === "production") {
  initSentry({
    dsn: config.get("sentry.clientDsn"),
    environment: config.get("sentry.environment"),
    release: config.get("releaseVersion"),
  });
}

const renderRoot = () => {
  const container = document.querySelector("#root");
  const root = createRoot(container);
  root.render(<App />);
};

renderRoot();
