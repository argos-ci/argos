import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "./Breadcrumb";

const meta = {
  title: "UI/Breadcrumb",
  component: BreadcrumbItem,
} satisfies Meta<typeof BreadcrumbItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <nav>
      <ol className="flex items-center gap-2">
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#" aria-current="page">
            Frontend
          </BreadcrumbLink>
        </BreadcrumbItem>
      </ol>
    </nav>
  ),
};
