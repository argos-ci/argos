import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { PullRequestButton } from "@/containers/PullRequestButton";
import { BuildStatus, BuildType, PullRequestState } from "@/gql/graphql";
import { openOverlayParameters, OverlayStage } from "@/ui/storyOverlay";

import { PullRequestStackMenu } from "./PullRequestStack";

type Build = ComponentProps<typeof PullRequestStackMenu>["build"];
type StackItem = NonNullable<Build["pullRequestStack"]>["items"][number];

function item(
  number: number,
  title: string,
  build: { type?: BuildType; status: BuildStatus } | null,
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
      ? {
          __typename: "Build",
          id: String(number),
          number: number - 100,
          type: build.type ?? BuildType.Check,
          status: build.status,
        }
      : null,
  };
}

/** The build of `current`, in a stack of `items` merging into `baseBranch`. */
function stack(
  items: StackItem[],
  current: number,
  baseBranch = "main",
): Build {
  return {
    __typename: "Build",
    pullRequest: { __typename: "GithubPullRequest", id: String(current) },
    pullRequestStack: { __typename: "PullRequestStack", baseBranch, items },
  };
}

const top = item(103, "Animate the order total", null);
const middle = item(102, "Refactor the order summary card", {
  status: BuildStatus.NoChanges,
});
const bottom = item(101, "Add the order summary", {
  status: BuildStatus.ChangesDetected,
});

const meta = {
  title: "Pages/Build/PullRequestStack",
  component: PullRequestStackMenu,
  args: {
    build: stack([top, middle, bottom], 102),
    accountSlug: "acme",
    projectName: "sparkle",
  },
  render: (args) => (
    <OverlayStage>
      <PullRequestStackMenu {...args} />
    </OverlayStage>
  ),
} satisfies Meta<typeof PullRequestStackMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The trigger alone, as the header shows it until it is pressed. */
export const Closed: Story = {
  render: (args) => (
    <div className="p-4">
      <PullRequestStackMenu {...args} />
    </div>
  ),
};

/** The pull request being looked at sits in the middle of its stack. */
export const Open: Story = {
  parameters: openOverlayParameters,
  args: { defaultOpen: true },
};

/** Nothing is built on the pull request yet. */
export const OpenAtTop: Story = {
  parameters: openOverlayParameters,
  args: { defaultOpen: true, build: stack([top, middle, bottom], 103) },
};

/** The pull request merges into `main`, the others build on it. */
export const OpenAtBottom: Story = {
  parameters: openOverlayParameters,
  args: { defaultOpen: true, build: stack([top, middle, bottom], 101) },
};

/** The smallest stack: one pull request on another. */
export const TwoPullRequests: Story = {
  parameters: openOverlayParameters,
  args: { defaultOpen: true, build: stack([middle, bottom], 102) },
};

/** Titles are cut to the width of the menu rather than widening it. */
export const LongTitles: Story = {
  parameters: openOverlayParameters,
  args: {
    defaultOpen: true,
    build: stack(
      [
        item(
          202,
          "Move every checkout step behind the new payment provider and drop the legacy fallback",
          { status: BuildStatus.ChangesDetected },
        ),
        item(
          201,
          "Introduce the payment provider abstraction shared by checkout and subscriptions",
          { status: BuildStatus.Accepted },
        ),
      ],
      202,
      "release/2026-11-very-long-release-branch-name",
    ),
  },
};

/**
 * Each row carries the status of its latest build, with the icons the build
 * list uses, so a reviewer can see where the stack stands before opening it.
 */
export const BuildStatuses: Story = {
  parameters: openOverlayParameters,
  args: {
    defaultOpen: true,
    build: stack(
      [
        item(109, "Polish the empty cart", null),
        item(108, "Retry the payment request", {
          status: BuildStatus.Progress,
        }),
        item(107, "Queue the confirmation email", {
          status: BuildStatus.Pending,
        }),
        item(106, "Show the shipping estimate", {
          status: BuildStatus.Error,
        }),
        item(105, "Round the tax amounts", { status: BuildStatus.Rejected }),
        item(104, "Add the promo code field", {
          status: BuildStatus.Accepted,
        }),
        item(103, "Animate the order total", {
          status: BuildStatus.ChangesDetected,
        }),
        item(102, "Refactor the order summary card", {
          status: BuildStatus.NoChanges,
        }),
        item(101, "Add the order summary", {
          type: BuildType.Orphan,
          status: BuildStatus.NoChanges,
        }),
      ],
      104,
    ),
  },
};

const pullRequest = {
  __typename: "GithubPullRequest",
  title: "Refactor the order summary card",
  number: 102,
  url: "https://github.com/acme/sparkle/pull/102",
  draft: false,
  merged: false,
  mergedAt: null,
  closedAt: null,
  state: PullRequestState.Open,
  date: "2026-11-18T09:00:00.000Z",
  creator: {
    __typename: "GithubAccount",
    id: "1",
    login: "acme",
    name: "Acme",
    avatar: {
      __typename: "AccountAvatar",
      url: null,
      color: "#7c3aed",
      initial: "A",
    },
  },
} satisfies ComponentProps<typeof PullRequestButton>["pullRequest"];

/** Where the header puts it: right before the pull request it belongs to. */
export const InHeader: Story = {
  parameters: openOverlayParameters,
  args: { defaultOpen: true },
  render: (args) => (
    <OverlayStage>
      <div className="flex w-full max-w-2xl items-center justify-end gap-2">
        <PullRequestStackMenu {...args} />
        <PullRequestButton pullRequest={pullRequest} size="small" />
      </div>
    </OverlayStage>
  ),
};
