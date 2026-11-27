import { invariant } from "@argos/util/invariant";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import { TeamAvatarCard } from "./ChangeAvatar";

const logo = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#635bff"/><path d="M20 22h24v6H26v4h14v6H26v4h18v6H20z" fill="#fff"/></svg>',
)}`;

const meta = {
  title: "Containers/Team/TeamAvatarCard",
  component: TeamAvatarCard,
  args: {
    avatar: {
      __typename: "AccountAvatar",
      url: null,
      color: "#4527a0",
      initial: "A",
    },
    hasCustomAvatar: false,
    onUpload: fn(async () => {}),
    onRemove: fn(async () => {}),
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TeamAvatarCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {};

export const CustomAvatar: Story = {
  args: {
    avatar: {
      __typename: "AccountAvatar",
      url: logo,
      color: "#4527a0",
      initial: "A",
    },
    hasCustomAvatar: true,
  },
};

export const UploadsTheChosenFile: Story = {
  play: async ({ args, canvasElement }) => {
    const input =
      canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
    invariant(input, "file input not rendered");
    const file = new File(["png"], "logo.png", { type: "image/png" });
    await userEvent.upload(input, file);
    await expect(args.onUpload).toHaveBeenCalledWith(file);
  },
};
