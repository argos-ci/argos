/**
 * Sentry instrumentation, loaded through `node --import` so it runs in its own
 * module graph before the process entry point is evaluated.
 *
 * This has to happen before anything the SDK instruments — `http`, `express`,
 * `pg` — is imported. Placing `import "./setup"` first in an entry file only
 * achieved that while every module was emitted as its own file: a bundler is
 * free to hoist `express` and `pg` above the statement that calls
 * `Sentry.init()`, at which point the SDK patches modules that are already
 * loaded. `--import` is a guarantee from Node instead of an accident of layout.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/node/install/esm/
 */
import { setup as setupSentry } from "@/sentry";

setupSentry();
