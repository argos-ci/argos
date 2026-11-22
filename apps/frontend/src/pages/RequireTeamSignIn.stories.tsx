import type { Meta, StoryObj } from "@storybook/react-vite";

import { TeamAuthMethod } from "@/gql/graphql";

import { RequireTeamSignIn } from "./RequireTeamSignIn";

const meta = {
  title: "Pages/RequireTeamSignIn",
  component: RequireTeamSignIn,
  args: {
    authMethod: TeamAuthMethod.Saml,
    teamSlug: "acme",
    redirect: "/acme",
  },
} satisfies Meta<typeof RequireTeamSignIn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saml: Story = {};

export const Google: Story = {
  args: { authMethod: TeamAuthMethod.Google },
};

export const GitHub: Story = {
  args: { authMethod: TeamAuthMethod.Github },
};
