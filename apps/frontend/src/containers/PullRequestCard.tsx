import {
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
} from "@primer/octicons-react";
import { clsx } from "clsx";

import { DocumentType, graphql } from "@/gql";
import { PullRequestState } from "@/gql/graphql";
import { Chip, type ChipColor } from "@/ui/Chip";
import { HeadlessLink } from "@/ui/Link";
import { Truncable } from "@/ui/Truncable";

import { PullRequestActivity } from "./PullRequestButton";
import { PullRequestProviderIcons } from "./Repository";

const _PullRequestFragment = graphql(`
  fragment PullRequestCard_PullRequest on PullRequest {
    __typename
    id
    title
    number
    url
    draft
    merged
    state
    ...PullRequestActivity_PullRequest
  }
`);

const _RepositoryFragment = graphql(`
  fragment PullRequestCard_Repository on Repository {
    id
    fullName
  }
`);

type PullRequest = DocumentType<typeof _PullRequestFragment>;

function getPullRequestStatus(pullRequest: PullRequest): {
  label: string;
  color: ChipColor;
  icon: React.ComponentType<{ className?: string }>;
} {
  if (pullRequest.merged) {
    return { label: "Merged", color: "primary", icon: GitMergeIcon };
  }
  if (pullRequest.state === PullRequestState.Closed) {
    return { label: "Closed", color: "danger", icon: GitPullRequestClosedIcon };
  }
  if (pullRequest.draft) {
    return { label: "Draft", color: "neutral", icon: GitPullRequestDraftIcon };
  }
  return { label: "Open", color: "success", icon: GitPullRequestIcon };
}

/**
 * A pull request at a glance, laid out like the top of its own page: the
 * repository, the title, and where it stands. The whole card links to it.
 */
export function PullRequestCard(props: {
  pullRequest: PullRequest;
  repository: DocumentType<typeof _RepositoryFragment> | null;
  className?: string;
}) {
  const { pullRequest, repository, className } = props;
  const ProviderIcon = PullRequestProviderIcons[pullRequest.__typename];
  const status = getPullRequestStatus(pullRequest);
  return (
    <HeadlessLink
      href={pullRequest.url}
      className={clsx(
        "bg-app hover:bg-hover border-thin flex flex-col gap-2 rounded-lg p-4",
        className,
      )}
    >
      {repository ? (
        <div className="text-low flex min-w-0 items-center gap-1.5 text-xs">
          <ProviderIcon className="size-3.5 shrink-0" />
          <Truncable>{repository.fullName}</Truncable>
        </div>
      ) : null}
      <div className="font-medium wrap-break-word">
        {pullRequest.title ?? "Pull request"}{" "}
        <span className="text-low font-normal">#{pullRequest.number}</span>
      </div>
      <div className="text-low flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Chip scale="sm" color={status.color} icon={status.icon}>
          {status.label}
        </Chip>
        <span className="flex items-center gap-1">
          <PullRequestActivity pullRequest={pullRequest} />
        </span>
      </div>
    </HeadlessLink>
  );
}
