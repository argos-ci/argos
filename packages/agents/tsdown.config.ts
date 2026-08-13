import { defineConfig } from "tsdown";

export default defineConfig({
  // Two entries, deliberately: the backend imports only `index`, so React and
  // the brand SVGs never reach the server bundle.
  entry: ["src/index.ts", "src/react.tsx"],
  // Not the Node version: the frontend imports this package too, so the output
  // has to stay within reach of the browser baseline in .browserslistrc. Vite
  // lowers the final bundle further, this is just the floor.
  target: "es2022",
  dts: false,
  failOnWarn: true,
  clean: true,
  fixedExtension: false,
});
