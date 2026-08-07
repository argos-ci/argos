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
  target: "node26",
  // Types are covered by `tsc --noEmit`; nothing consumes this package.
  dts: false,
  // An import tsdown cannot resolve is left external with a warning, and the
  // process would then die on its first import. Make it a build failure.
  failOnWarn: true,
  clean: true,
  fixedExtension: false,
});
