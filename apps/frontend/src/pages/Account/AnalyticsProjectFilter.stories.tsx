import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProjectFilterMenu } from "./Analytics";

function ProjectFilterPlayground(props: { count: number }) {
  const projects = Array.from({ length: props.count }, (_, i) => ({
    id: String(i + 1),
    name: [
      "argos",
      "argos-ci.com",
      "argos-javascript",
      "storybook",
      "design-system",
      "marketing-site",
      "mobile-app",
      "docs",
    ][i]!,
  }));
  const [value, setValue] = useState<string[]>([]);
  return (
    <div className="p-10">
      <ProjectFilterMenu
        projects={projects}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

const meta: Meta<typeof ProjectFilterPlayground> = {
  title: "Pages/AnalyticsProjectFilter",
  component: ProjectFilterPlayground,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSearch: Story = {
  args: { count: 8 },
};

export const WithoutSearch: Story = {
  args: { count: 4 },
};
