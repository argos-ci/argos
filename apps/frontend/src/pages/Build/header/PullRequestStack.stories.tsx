import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { BuildStatus, BuildType } from "@/gql/graphql";
import { openOverlayParameters, OverlayStage } from "@/ui/storyOverlay";

import { PullRequestStack } from "./PullRequestStack";

type Build = ComponentProps<typeof PullRequestStack>["build"];
type StackItem = NonNullable<Build["pullRequestStack"]>["items"][number];

function item(
  number: number,
  title: string,
  build: { number: number; type: BuildType; status: BuildStatus } | null,
): StackItem {
  return {
    __typename: "PullRequestStackItem",
    pullRequest: {
      __typename: "GithubPullRequest",
      id: String(number),
      number,
      title,
    },
    build: build
      ? { __typename: "Build", id: String(build.number), ...build }
      : null,
  };
}

const build = {
  __typename: "Build",
  pullRequest: { __typename: "GithubPullRequest", id: "102" },
  pullRequestStack: {
    __typename: "PullRequestStack",
    baseBranch: "main",
    items: [
      item(103, "Animate the order total", null),
      item(102, "Refactor the order summary card", {
        number: 2,
        type: BuildType.Check,
        status: BuildStatus.NoChanges,
      }),
      item(101, "Add the order summary", {
        number: 1,
        type: BuildType.Check,
        status: BuildStatus.ChangesDetected,
      }),
    ],
  },
} satisfies Build;

const meta = {
  title: "Pages/Build/PullRequestStack",
  component: PullRequestStack,
  args: { build, accountSlug: "acme", projectName: "sparkle" },
} satisfies Meta<typeof PullRequestStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

/** The pull request being looked at sits in the middle of its stack. */
export const Open: Story = {
  parameters: openOverlayParameters,
  args: { defaultOpen: true },
  render: (args) => (
    <OverlayStage>
      <PullRequestStack {...args} />
    </OverlayStage>
  ),
};
