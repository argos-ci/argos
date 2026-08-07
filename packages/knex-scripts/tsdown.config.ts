import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/cli.ts"],
  platform: "node",
  target: "node26",
  dts: false,
  failOnWarn: true,
  clean: true,
  fixedExtension: false,
});
