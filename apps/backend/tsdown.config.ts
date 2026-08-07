import { defineConfig } from "tsdown";

export default defineConfig({
  // `instrument.ts` is loaded through `node --import`, the process entries are
  // what production runs, and knexfile.js reads `config/index.js` and
  // `config/database.js` straight off disk.
  entry: [
    "src/instrument.ts",
    "src/processes/proc/*.ts",
    "src/*/bin/*.ts",
    "src/config/index.ts",
    "src/config/database.ts",
  ],
  platform: "node",
  // Dependencies stay external, which is tsdown's default — do not add
  // `noExternal` to shrink the deploy. `sharp` and `@argos-ci/mask-fingerprint`
  // ship per-platform `.node` bindings and `odiff-bin` spawns an executable it
  // locates next to its own package, none of which survives bundling. Sentry
  // also patches `express`, `pg` and `http` as they load, so inlining them
  // leaves its instrumentation nothing to hook and tracing quietly stops.
  target: "node26",
  // Types are covered by `tsc --noEmit`; nothing consumes this package.
  dts: false,
  // An import tsdown cannot resolve is left external with a warning, and the
  // process would then die on its first import. Make it a build failure.
  failOnWarn: true,
  clean: true,
  fixedExtension: false,
});
