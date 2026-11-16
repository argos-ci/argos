import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { PullRequestState } from "@/gql/graphql";
import { StoryTitle } from "@/ui/StoryTitle";

import { PullRequestCard } from "./PullRequestCard";

type PullRequest = ComponentProps<typeof PullRequestCard>["pullRequest"];

const openPullRequest = {
  __typename: "GithubPullRequest",
  id: "1",
  title: "Tighten the checkout spacing",
  number: 1234,
  url: "https://github.com/acme/sparkle/pull/1234",
  draft: false,
  merged: false,
  mergedAt: null,
  closedAt: null,
  state: PullRequestState.Open,
  date: "2026-04-19T09:00:00.000Z",
  creator: {
    __typename: "GithubAccount",
    id: "1",
    login: "argos-ci",
    name: "Argos",
  },
} satisfies PullRequest;

const repository = {
  __typename: "GithubRepository",
  id: "1",
  fullName: "acme/sparkle",
} satisfies ComponentProps<typeof PullRequestCard>["repository"];

const examples: { title: string; pullRequest: PullRequest }[] = [
  { title: "Open", pullRequest: openPullRequest },
  {
    title: "Draft",
    pullRequest: { ...openPullRequest, draft: true, creator: null },
  },
  {
    title: "Merged",
    pullRequest: {
      ...openPullRequest,
      merged: true,
      mergedAt: "2026-04-21T09:00:00.000Z",
      state: PullRequestState.Closed,
    },
  },
  {
    title: "Closed",
    pullRequest: {
      ...openPullRequest,
      closedAt: "2026-04-21T09:00:00.000Z",
      state: PullRequestState.Closed,
    },
  },
  {
    // Argos knows the number before it has fetched the rest from GitHub.
    title: "Not fetched yet",
    pullRequest: {
      ...openPullRequest,
      title: null,
      state: null,
      date: null,
      creator: null,
    },
  },
  {
    title: "Long title",
    pullRequest: {
      ...openPullRequest,
      title:
        "Rework the checkout flow so the summary, the shipping options and the payment step share one layout on every breakpoint",
    },
  },
];

const meta = {
  title: "Containers/PullRequestCard",
  component: PullRequestCard,
  args: { pullRequest: openPullRequest, repository },
} satisfies Meta<typeof PullRequestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col">
      {examples.map((example) => (
        <div key={example.title}>
          <StoryTitle>{example.title}</StoryTitle>
          <PullRequestCard
            pullRequest={example.pullRequest}
            repository={repository}
          />
        </div>
      ))}
    </div>
  ),
};

/** A project no longer connected to its repository. */
export const WithoutRepository: Story = {
  args: { repository: null },
};
