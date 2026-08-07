import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "node",
  // This plugin only ever runs in Node, under Vite's config loader.
  target: "node26",
  dts: false,
  failOnWarn: true,
  clean: true,
  fixedExtension: false,
});
