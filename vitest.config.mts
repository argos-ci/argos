import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig, UserConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    exclude: ["node_modules", "tests", "examples", "**/dist"],
  },
}) as UserConfig;
