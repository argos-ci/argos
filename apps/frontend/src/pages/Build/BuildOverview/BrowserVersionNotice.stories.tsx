import type { Meta, StoryObj } from "@storybook/react-vite";

import type { BrowserVersionChange } from "../metadata/browser/browserVersionChange";
import { BrowserVersionNotice } from "./BrowserVersionNotice";

function change(
  name: string,
  baseVersion: string,
  compareVersion: string,
): BrowserVersionChange {
  return { name, baseVersion, compareVersion };
}

const meta = {
  title: "Pages/Build/BrowserVersionNotice",
  component: BrowserVersionNotice,
  decorators: [
    (Story) => (
      <div className="max-w-3xl p-6">
        <Story />
      </div>
    ),
  ],
  args: {
    changes: [change("chromium", "140.0.7339.16", "141.0.7390.37")],
  },
} satisfies Meta<typeof BrowserVersionNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneBrowser: Story = {};

export const SeveralBrowsers: Story = {
  args: {
    changes: [
      change("chromium", "140.0.7339.16", "141.0.7390.37"),
      change("firefox", "141.0", "142.0.1"),
      change("webkit", "26.0", "26.0.1"),
    ],
  },
};

/** A baseline taken across several versions lists each one. */
export const SeveralBaselineVersions: Story = {
  args: {
    changes: [
      change("chromium", "139.0.7258.5", "141.0.7390.37"),
      change("chromium", "140.0.7339.16", "141.0.7390.37"),
    ],
  },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};
