import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { StoryTitle } from "@/ui/StoryTitle";

import { StaffTeamCell } from "./StaffTeamCell";

type Team = ComponentProps<typeof StaffTeamCell>["team"];

const team = {
  slug: "acme",
  name: "Acme",
  stripeCustomerId: "cus_123",
  avatar: {
    __typename: "AccountAvatar",
    url: null,
    color: "#7c3aed",
    initial: "A",
  },
} satisfies Team;

const examples: {
  title: string;
  team: Team;
  line?: string;
}[] = [
  { title: "Stripe customer", team },
  {
    title: "No Stripe customer",
    team: { ...team, stripeCustomerId: null },
  },
  {
    title: "Line under the name",
    team,
    line: "Enterprise annual, yearly",
  },
  {
    title: "Long name",
    team: {
      ...team,
      name: "Acme Corporation International Holdings",
    },
  },
  {
    title: "No name",
    team: { ...team, name: null },
  },
  {
    title: "No avatar",
    team: { ...team, avatar: undefined },
  },
];

const meta = {
  title: "Pages/Staff/StaffTeamCell",
  component: StaffTeamCell,
  args: { team },
} satisfies Meta<typeof StaffTeamCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    // The width of a Team column in the staff tables.
    <div className="flex w-64 flex-col text-sm">
      {examples.map((example) => (
        <div key={example.title}>
          <StoryTitle>{example.title}</StoryTitle>
          <StaffTeamCell team={example.team}>
            {example.line ? (
              <div className="text-low truncate text-xs">{example.line}</div>
            ) : null}
          </StaffTeamCell>
        </div>
      ))}
    </div>
  ),
};
