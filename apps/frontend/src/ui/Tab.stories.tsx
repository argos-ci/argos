import type { Meta, StoryObj } from "@storybook/react-vite";
import { TabPanel, Tabs } from "react-aria-components";

import { PillTab, Tab, TabList } from "./Tab";

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

/**
 * The pill tabs, which wear the button's surface so a row of them lines up
 * with a row of buttons. That sharing is exactly why the selected one needs
 * the `on` variant: a tab says it is chosen with `aria-selected`, a toggle
 * button with `aria-pressed`, and the button's "on" look has to answer to
 * either — without it the selected pill sat there looking untouched.
 */
export const Pill: Story = {
  render: () => (
    <Tabs>
      <TabList className="flex gap-2 p-4">
        <PillTab id="snapshot">Snapshot</PillTab>
        <PillTab id="review">Review</PillTab>
      </TabList>
      <TabPanel id="snapshot" className="px-4 pb-4 text-sm">
        Snapshot content
      </TabPanel>
      <TabPanel id="review" className="px-4 pb-4 text-sm">
        Review content
      </TabPanel>
    </Tabs>
  ),
};
