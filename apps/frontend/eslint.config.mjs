import { config } from "@argos/eslint-config/react";
import { defineConfig, globalIgnores } from "eslint/config";

/** @type {import("eslint").Linter.Config[]} */
export default defineConfig(
  globalIgnores(["src/gql/**/*", "storybook-static"]),
  ...config,
  {
    ignores: ["src/ui/Toaster.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "sonner",
              message:
                'Import { toast, Toaster } from "@/ui/Toaster" instead, it handles theming and emphasizes duplicate toasts.',
            },
          ],
        },
      ],
    },
  },
);
