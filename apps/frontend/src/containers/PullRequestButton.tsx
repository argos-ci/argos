import { Tooltip } from "@/ui/Tooltip";
import { Button, ButtonIcon, ButtonSize } from "@/ui/Button";
import {
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
} from "@primer/octicons-react";
import { FragmentType, graphql, useFragment } from "@/gql";
import { PullRequestState } from "@/gql/graphql";
import * as React from "react";
import { ImageAvatar } from "./ImageAvatar";
import { Time } from "@/ui/Time";
import { clsx } from "clsx";

const PullRequestStatusIconFragment = graphql(`
  fragment PullRequestStatusIcon_PullRequest on PullRequest {
    draft
    merged
    state
  }
`);

const PullRequestStatusIcon = (props: {
  pullRequest: FragmentType<typeof PullRequestStatusIconFragment>;
}) => {
  const pullRequest = useFragment(
    PullRequestStatusIconFragment,
    props.pullRequest,
  );

  if (pullRequest.merged) {
    return (
      <ButtonIcon className="text-primary-low">
        <GitMergeIcon />
      </ButtonIcon>
    );
  }
  if (pullRequest.draft) {
    return (
      <ButtonIcon className="text-secondary-low">
        <GitPullRequestDraftIcon />
      </ButtonIcon>
    );
  }
  switch (pullRequest.state) {
    case PullRequestState.Closed: {
      return (
        <ButtonIcon className="text-danger-low">
          <GitPullRequestClosedIcon />
        </ButtonIcon>
      );
    }
    case PullRequestState.Open:
    default:
      return (
        <ButtonIcon className="text-success-low">
          <GitPullRequestIcon />
        </ButtonIcon>
      );
  }
};

const PullRequestInfoFragment = graphql(`
  fragment PullRequestInfo_PullRequest on PullRequest {
    title
    draft
    merged
    mergedAt
    closedAt
    state
    number
    date
    url
    ...PullRequestStatusIcon_PullRequest
    ... on GithubPullRequest {
      creator {
        id
        login
        name
      }
    }
  }
`);

const PullRequestInfo = (props: {
  pullRequest: FragmentType<typeof PullRequestInfoFragment>;
}) => {
  const pullRequest = useFragment(PullRequestInfoFragment, props.pullRequest);
  if (!pullRequest.title || !pullRequest.date || !pullRequest.creator) {
    return null;
  }
  return (
    <div className="flex gap-2">
      <div className="flex mt-1">
        <PullRequestStatusIcon pullRequest={pullRequest} />
      </div>
      <div>
        <div>
          <a
            href={pullRequest.url}
            onClick={(event) => {
              event.stopPropagation();
            }}
            className="inline-flex gap-2 items-center rounded hover:bg-hover px-1"
          >
            <span className="flex gap-2 min-w-0 max-w-prose items-center">
              <span className="flex-1 min-w-0 truncate">
                {pullRequest.title}
              </span>
              <span className="text-low font-normal">
                #{pullRequest.number}
              </span>
            </span>
          </a>
        </div>
        <div className="flex items-center gap-1 text-low px-1">
          {(() => {
            if (pullRequest.merged && pullRequest.mergedAt) {
              return (
                <>
                  Merged <Time date={pullRequest.mergedAt} tooltip="title" />
                </>
              );
            }
            if (
              pullRequest.state === PullRequestState.Closed &&
              pullRequest.closedAt
            ) {
              return (
                <>
                  Closed <Time date={pullRequest.closedAt} tooltip="title" />
                </>
              );
            }
            return (
              <>
                {pullRequest.draft ? "Draft opened" : "Opened"}{" "}
                <Time date={pullRequest.date} tooltip="title" /> by
                <ImageAvatar
                  url={`https://github.com/${pullRequest.creator.login}.png?size=32`}
                  size={16}
                  className="shrink-0"
                />
                <span>
                  {pullRequest.creator.name || pullRequest.creator.login}
                </span>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

const PullRequestButtonFragment = graphql(`
  fragment PullRequestButton_PullRequest on PullRequest {
    title
    number
    url
    ...PullRequestStatusIcon_PullRequest
    ...PullRequestInfo_PullRequest
  }
`);

const FakeAnchor = React.forwardRef(
  (
    { href, ...props }: { href: string } & React.HTMLAttributes<HTMLDivElement>,
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    return (
      <div
        ref={ref}
        onClick={(event) => {
          event.preventDefault();
          window.open(href, "_blank")?.focus();
        }}
        {...props}
      />
    );
  },
);

export const PullRequestButton = (props: {
  pullRequest: FragmentType<typeof PullRequestButtonFragment>;
  size?: ButtonSize;
  fakeAnchor?: boolean;
  className?: string;
}) => {
  const pullRequest = useFragment(PullRequestButtonFragment, props.pullRequest);
  const Anchor = props.fakeAnchor ? FakeAnchor : "a";
  return (
    <Tooltip
      variant="info"
      disableHoverableContent={false}
      content={
        pullRequest.title && <PullRequestInfo pullRequest={pullRequest} />
      }
    >
      <Button
        color="neutral"
        variant="outline"
        size={props.size}
        className={clsx("min-w-0 !bg-app", props.className)}
      >
        {(buttonProps) => (
          <Anchor {...buttonProps} href={pullRequest.url}>
            <>
              <PullRequestStatusIcon pullRequest={pullRequest} />
              {pullRequest.title ? (
                <span className="flex gap-2 min-w-0 max-w-prose items-center">
                  <span className="flex-1 min-w-0 truncate">
                    {pullRequest.title}
                  </span>
                  <span className="text-low font-normal">
                    #{pullRequest.number}
                  </span>
                </span>
              ) : (
                <>#{pullRequest.number}</>
              )}
            </>
          </Anchor>
        )}
      </Button>
    </Tooltip>
  );
};
