import { clsx } from "clsx";

import { DocumentType, graphql } from "@/gql";
import { Chip } from "@/ui/Chip";
import { HeadlessLink } from "@/ui/Link";
import { getSurfaceClassName } from "@/ui/Panel";
import { Truncable } from "@/ui/Truncable";

import { getPullRequestStatus, PullRequestActivity } from "./PullRequestButton";
import { RepositoryIcons } from "./Repository";

const _PullRequestFragment = graphql(`
  fragment PullRequestCard_PullRequest on PullRequest {
    id
    title
    number
    url
    repository {
      id
      fullName
    }
    ...PullRequestStatus_PullRequest
    ...PullRequestActivity_PullRequest
  }
`);

/**
 * A pull request at a glance, laid out like the top of its own page: the
 * repository, the title, and where it stands. The whole card links to it.
 */
export function PullRequestCard(props: {
  pullRequest: DocumentType<typeof _PullRequestFragment>;
  className?: string;
}) {
  const { pullRequest, className } = props;
  const { repository } = pullRequest;
  const RepositoryIcon = RepositoryIcons[repository.__typename];
  const status = getPullRequestStatus(pullRequest);
  return (
    <HeadlessLink
      href={pullRequest.url}
      className={clsx(
        getSurfaceClassName(),
        "hover:bg-hover focus-visible:bg-hover flex flex-col gap-2 p-4",
        className,
      )}
    >
      <div className="text-low flex min-w-0 items-center gap-1.5 text-xs">
        <RepositoryIcon className="size-3.5 shrink-0" />
        <Truncable>{repository.fullName}</Truncable>
      </div>
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
