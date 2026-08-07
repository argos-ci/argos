import { defineConfig } from "tsdown";

export default defineConfig({
  // One output per source file, matching the `./*` subpath exports.
  entry: ["src/*.ts", "!src/*.test.ts"],
  platform: "node",
  // Not the Node version: the frontend imports this package too, so the output
  // has to stay within reach of the browser baseline in .browserslistrc. Vite
  // lowers the final bundle further, this is just the floor.
  target: "es2022",
  dts: false,
  failOnWarn: true,
  clean: true,
  fixedExtension: false,
});
