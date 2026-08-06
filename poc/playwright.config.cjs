/**
 * Standalone Playwright config for the Flows POC driver. Kept in CJS with no
 * backend imports so it runs on a locally-installed Node (the stock e2e setup
 * only works inside the Playwright Docker image).
 *
 * The web server binds port 3939 to leave 3000 to the regular dev server.
 *
 *   NODE_ENV=test TZ=utc pnpm exec playwright test \
 *     --config=poc/playwright.config.cjs --project=chromium
 */
const path = require("node:path");

const { getCSPScriptHash } = require("@argos-ci/playwright");

module.exports = {
  testDir: __dirname,
  testMatch: /screenshots\.spec\.cjs/,
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  use: {
    baseURL: "http://localhost:3939",
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  },
  webServer: {
    command: `node ${JSON.stringify(
      path.join(
        __dirname,
        "..",
        "apps",
        "backend",
        "dist",
        "processes",
        "proc",
        "web.js",
      ),
    )}`,
    url: "http://localhost:3939",
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      NODE_ENV: "test",
      PORT: "3939",
      SERVER_URL: "http://localhost:3939",
      TZ: "utc",
      CSP_SCRIPT_SRC: `${getCSPScriptHash()},'unsafe-eval'`,
    },
  },
};
