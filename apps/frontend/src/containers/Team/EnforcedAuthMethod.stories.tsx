import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { TeamAuthMethod } from "@/gql/graphql";

import { EnforcedAuthMethodCard } from "./EnforcedAuthMethod";

const allSetUp = {
  [TeamAuthMethod.Google]: true,
  [TeamAuthMethod.Github]: true,
  [TeamAuthMethod.Saml]: true,
};

const meta = {
  title: "Containers/Team/EnforcedAuthMethodCard",
  component: EnforcedAuthMethodCard,
  args: {
    teamSlug: "acme",
    enforcedAuthMethod: null,
    viewerAuthMethod: null,
    setUp: allSetUp,
    onSave: fn(async () => {}),
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EnforcedAuthMethodCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AnyMethod: Story = {};

export const NothingSetUp: Story = {
  args: {
    setUp: {
      [TeamAuthMethod.Google]: false,
      [TeamAuthMethod.Github]: false,
      [TeamAuthMethod.Saml]: false,
    },
  },
};

export const GoogleRequired: Story = {
  args: {
    enforcedAuthMethod: TeamAuthMethod.Google,
    viewerAuthMethod: TeamAuthMethod.Google,
  },
};

export const SamlRequired: Story = {
  args: {
    enforcedAuthMethod: TeamAuthMethod.Saml,
    viewerAuthMethod: TeamAuthMethod.Saml,
  },
};

export const SamlTurnedOff: Story = {
  args: {
    enforcedAuthMethod: TeamAuthMethod.Saml,
    setUp: { ...allSetUp, [TeamAuthMethod.Saml]: false },
  },
};

export const SignInRequired: Story = {
  args: {
    viewerAuthMethod: TeamAuthMethod.Google,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /GitHub/ }));
    await expect(
      canvas.getByRole("link", { name: "Sign in with GitHub" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();
  },
};
