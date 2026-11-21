import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { TeamAuthMethod } from "@/gql/graphql";

import { EnforcedAuthMethodCard } from "./EnforcedAuthMethod";

const meta = {
  title: "Containers/Team/EnforcedAuthMethodCard",
  component: EnforcedAuthMethodCard,
  args: {
    teamSlug: "acme",
    enforcedAuthMethod: null,
    viewerAuthMethod: null,
    samlEnabled: false,
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
    samlEnabled: true,
  },
};

export const SamlTurnedOff: Story = {
  args: {
    enforcedAuthMethod: TeamAuthMethod.Saml,
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
