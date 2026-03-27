import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Pagination,
  PaginationButtonItem,
  PaginationContent,
  PaginationEllipsis,
  PaginationNext,
  PaginationPrevious,
} from "./Pagination";

const meta = {
  title: "UI/Pagination",
  component: Pagination,
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationPrevious />
        <PaginationButtonItem isActive>1</PaginationButtonItem>
        <PaginationButtonItem>2</PaginationButtonItem>
        <PaginationButtonItem>3</PaginationButtonItem>
        <PaginationEllipsis />
        <PaginationButtonItem>10</PaginationButtonItem>
        <PaginationNext />
      </PaginationContent>
    </Pagination>
  ),
};
