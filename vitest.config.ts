import { UserConfig, defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    exclude: ["node_modules", "tests", "examples", "**/dist"],
  },
}) as UserConfig;
