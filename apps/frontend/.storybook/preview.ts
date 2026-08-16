import { createElement } from "react";
import type { Preview } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";

import { TooltipProvider } from "../src/ui/Tooltip";
import "../src/index.css";

// Provide a mock clientData so that `src/config.ts` does not throw when
// modules are eagerly resolved by Vite.
(window as any).clientData ??= {
  config: {
    sentry: { environment: "storybook", clientDsn: "" },
    releaseVersion: "storybook",
    contactEmail: "",
    github: {
      appUrl: "",
      clientId: "",
      loginUrl: "",
      marketplaceUrl: "",
    },
    githubLight: { appUrl: "" },
    gitlab: { loginUrl: "" },
    stripe: { pricingTableId: "", publishableKey: "" },
    server: { url: "" },
    api: { baseUrl: "" },
    bucket: { publishableKey: "" },
  },
};

const preview: Preview = {
  // The app mounts this at the router root. Stories render outside it, so
  // without this a tooltip in Storybook would use Base UI's default delays
  // rather than the app's.
  // A router, because anything rendering a link renders react-router's, and a
  // tooltip provider, because the app mounts one at the router root.
  decorators: [
    (Story) =>
      createElement(
        MemoryRouter,
        null,
        createElement(TooltipProvider, null, createElement(Story)),
      ),
  ],

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
