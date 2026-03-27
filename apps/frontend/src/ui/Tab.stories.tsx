import type { Meta, StoryObj } from "@storybook/react-vite";
import { TabPanel, Tabs } from "react-aria-components";

import { Tab, TabList } from "./Tab";

const meta = {
  title: "UI/Tab",
  component: Tab,
} satisfies Meta<typeof Tab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs>
      <TabList>
        <Tab id="overview">Overview</Tab>
        <Tab id="builds">Builds</Tab>
        <Tab id="settings">Settings</Tab>
      </TabList>
      <TabPanel id="overview" className="p-4 text-sm">
        Overview content
      </TabPanel>
      <TabPanel id="builds" className="p-4 text-sm">
        Builds content
      </TabPanel>
      <TabPanel id="settings" className="p-4 text-sm">
        Settings content
      </TabPanel>
    </Tabs>
  ),
};
