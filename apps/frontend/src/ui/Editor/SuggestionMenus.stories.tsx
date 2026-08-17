import type { Meta, StoryObj } from "@storybook/react-vite";

import { openOverlayParameters } from "../storyOverlay";
import { MentionList } from "./mention";
import { SLASH_COMMAND_ITEMS, SlashCommandList } from "./slashCommand";

const MENTION_USERS = [
  { id: "1", label: "Greg Bergé", secondaryLabel: "gregberge", initial: "G" },
  { id: "2", label: "Jeremy Sfez", secondaryLabel: "jsfez", initial: "J" },
  {
    id: "3",
    label: "Kyle Bertolino",
    secondaryLabel: "kbertolino",
    initial: "K",
  },
];

/**
 * The two menus the editor raises while you type — `@` for a mention, `/` for
 * a block. A tiptap suggestion plugin drives them rather than the menu kit, so
 * they had no coverage at all and had drifted into a look of their own:
 * smaller corners, tighter rows, a different shadow and a different highlight
 * from every other menu in the app. They wear the shared menu style now, and
 * these are the baselines that keep them there.
 */
const meta = {
  title: "UI/Editor/SuggestionMenus",
  component: MentionList,
  args: { items: MENTION_USERS, command: () => {} },
} satisfies Meta<typeof MentionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mention: Story = {
  parameters: openOverlayParameters,
  render: (args) => (
    <div className="flex h-screen w-full items-start justify-center p-16">
      <MentionList {...args} />
    </div>
  ),
};

export const SlashCommand: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <div className="flex h-screen w-full items-start justify-center p-16">
      <SlashCommandList items={SLASH_COMMAND_ITEMS} command={() => {}} />
    </div>
  ),
};
