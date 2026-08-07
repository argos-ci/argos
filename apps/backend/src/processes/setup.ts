import { setupGracefulShutdown } from "@/graceful/shutdown";

// This file is used to set up the backend process environment.
//
// Sentry is deliberately not initialized here: it has to run before the modules
// it instruments are imported, which only `node --import ./dist/instrument.js`
// can guarantee. See src/instrument.ts.
setupGracefulShutdown();
