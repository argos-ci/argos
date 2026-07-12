import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import { ColorModeProvider } from "./ColorMode";
import { toast, Toaster } from "./Toaster";

const meta: Meta<typeof Toaster> = {
  title: "UI/Toaster",
  component: Toaster,
  decorators: [
    (Story) => (
      <ColorModeProvider>
        <Story />
        <Toaster />
      </ColorModeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onPress={() => toast("Issue URL copied to clipboard")}
      >
        Default
      </Button>
      <Button
        variant="secondary"
        onPress={() => toast.info("A new version of Argos is available")}
      >
        Info
      </Button>
      <Button
        variant="secondary"
        onPress={() => toast.success("Invitations sent successfully")}
      >
        Success
      </Button>
      <Button
        variant="secondary"
        onPress={() => toast.error("Something went wrong, please try again")}
      >
        Danger
      </Button>
      <Button
        variant="secondary"
        onPress={() => toast.warning("Your trial expires in 3 days")}
      >
        Warning
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          toast("greg/arg-462-expose-all-flakiness-stats-in-the-apicli", {
            description:
              "Branch name copied to clipboard. Paste it into your favorite git client.",
          })
        }
      >
        With description
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          toast.success("Build #4821 approved", {
            description: "12 screenshots changed",
            action: {
              label: "View",
              onClick: () => {},
            },
          })
        }
      >
        With action
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          toast.promise(
            new Promise((resolve) => {
              setTimeout(resolve, 2000);
            }),
            {
              loading: "Uploading screenshots…",
              success: "Screenshots uploaded",
              error: "Failed to upload screenshots",
            },
          )
        }
      >
        Promise
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          toast('"ARG-462" copied to clipboard', { id: "copy-issue-id" })
        }
      >
        Same id (zoom when repeated)
      </Button>
    </div>
  ),
};
