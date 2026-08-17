import type { Meta, StoryObj } from "@storybook/react-vite";

import { PillTab, Tab, TabList, TabPanel, Tabs } from "./Tab";

const meta = {
  title: "UI/Tab",
  component: Tab,
  args: { value: "overview", children: "Overview" },
} satisfies Meta<typeof Tab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabList>
        <Tab value="overview">Overview</Tab>
        <Tab value="builds">Builds</Tab>
        <Tab value="settings">Settings</Tab>
      </TabList>
      <TabPanel value="overview" className="p-4 text-sm">
        Overview content
      </TabPanel>
      <TabPanel value="builds" className="p-4 text-sm">
        Builds content
      </TabPanel>
      <TabPanel value="settings" className="p-4 text-sm">
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
    <Tabs defaultValue="snapshot">
      <TabList className="flex gap-2 p-4">
        <PillTab value="snapshot">Snapshot</PillTab>
        <PillTab value="review">Review</PillTab>
      </TabList>
      <TabPanel value="snapshot" className="px-4 pb-4 text-sm">
        Snapshot content
      </TabPanel>
      <TabPanel value="review" className="px-4 pb-4 text-sm">
        Review content
      </TabPanel>
    </Tabs>
  ),
};
