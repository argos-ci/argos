import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  List,
  ListEmpty,
  ListHeaderRow,
  ListRow,
  ListRowLoader,
  ListTitle,
} from "./List";
import { StoryTitle } from "./StoryTitle";

const meta = {
  title: "UI/List",
  component: List,
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Default</StoryTitle>
      <div className="max-w-md">
        <ListTitle>Projects</ListTitle>
        <List>
          <ListHeaderRow>
            <span className="flex-1">Name</span>
            <span className="w-20 text-right">Builds</span>
          </ListHeaderRow>
          <ListRow className="flex items-center gap-6 px-4 py-3 text-sm">
            <span className="flex-1">frontend</span>
            <span className="w-20 text-right">42</span>
          </ListRow>
          <ListRow className="flex items-center gap-6 px-4 py-3 text-sm">
            <span className="flex-1">backend</span>
            <span className="w-20 text-right">18</span>
          </ListRow>
        </List>
      </div>

      <StoryTitle>Empty</StoryTitle>
      <div className="max-w-md">
        <List>
          <ListEmpty>No projects found</ListEmpty>
        </List>
      </div>

      <StoryTitle>Loading</StoryTitle>
      <div className="max-w-md">
        <List>
          <ListRowLoader delay={0} className="py-6">
            Loading projects…
          </ListRowLoader>
        </List>
      </div>
    </div>
  ),
};
