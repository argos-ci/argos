import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { ColorModeProvider } from "@/ui/ColorMode";
import { openOverlayParameters, OverlayStage } from "@/ui/storyOverlay";
import { Toaster } from "@/ui/Toaster";

import { EvaluationStatus } from "./EvaluationStatus";
import {
  showReviewMarkToast,
  type ReviewMarkToastProps,
} from "./ReviewMarkToast";

function ReviewMarkToastStory(props: ReviewMarkToastProps) {
  const { move, mark, subject, takesBackRejection } = props;
  useEffect(() => {
    showReviewMarkToast({ move, mark, subject, takesBackRejection });
  }, [move, mark, subject, takesBackRejection]);
  return <OverlayStage />;
}

const meta = {
  title: "Pages/Build/ReviewMarkToast",
  component: ReviewMarkToastStory,
  parameters: openOverlayParameters,
  decorators: [
    (Story) => (
      <ColorModeProvider>
        <Story />
        <Toaster duration={Infinity} />
      </ColorModeProvider>
    ),
  ],
  args: {
    move: "undo",
    mark: EvaluationStatus.Accepted,
    subject: "homepage.png",
    takesBackRejection: false,
  },
  argTypes: {
    move: { control: "inline-radio", options: ["undo", "redo"] },
    mark: {
      control: "inline-radio",
      options: Object.values(EvaluationStatus),
    },
  },
  // The toast mounts after the story does: wait for it, or the screenshot
  // catches an empty stage.
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText(args.subject)).toBeVisible();
  },
} satisfies Meta<typeof ReviewMarkToastStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Undo: Story = {};

export const Redo: Story = {
  args: { move: "redo" },
};

export const Unmark: Story = {
  args: { mark: EvaluationStatus.Pending },
};

/** A collapsed group, or reapplied previous approvals, marked at once. */
export const SeveralSnapshots: Story = {
  args: { subject: "12 snapshots" },
};

export const TakesBackRejection: Story = {
  args: { mark: EvaluationStatus.Rejected, takesBackRejection: true },
};

/**
 * The name wraps instead of being truncated: its end is usually what tells
 * two snapshots apart.
 */
export const LongName: Story = {
  args: {
    subject:
      "chromium/settings/notifications/email-preferences-dark-mode-1280x720.png",
  },
};
