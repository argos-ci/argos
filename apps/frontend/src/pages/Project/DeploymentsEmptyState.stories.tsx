import type { Meta, StoryObj } from "@storybook/react-vite";

import { DeploymentsEmptyState } from "./DeploymentsEmptyState";

const meta = {
  title: "Pages/Project/DeploymentsEmptyState",
  component: DeploymentsEmptyState,
  args: {
    hostingEnabled: true,
    hostingSettingsUrl: "/acme/web/settings/deployments",
  },
} satisfies Meta<typeof DeploymentsEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoDeployments: Story = {};

export const HostingOff: Story = {
  args: { hostingEnabled: false },
};

export const HostingOffWithoutAdminAccess: Story = {
  args: { hostingEnabled: false, hostingSettingsUrl: null },
};
