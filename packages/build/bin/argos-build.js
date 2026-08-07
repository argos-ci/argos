#!/usr/bin/env node

// The CLI itself is TypeScript, run straight from source by Node's type
// stripping. This wrapper exists because pnpm only links `.js` bins.
import "../src/cli.ts";
