import * as React from "react";
import {
  GitMergeIcon,
  GitPullRequestClosedIcon,
  GitPullRequestDraftIcon,
  GitPullRequestIcon,
} from "@primer/octicons-react";
import { clsx } from "clsx";

import { FragmentType, graphql, useFragment } from "@/gql";
import { PullRequestState } from "@/gql/graphql";
import { EmulatedAnchor } from "@/ui/Anchor";
import { Button, ButtonIcon, ButtonSize } from "@/ui/Button";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";

import { ImageAvatar } from "./ImageAvatar";

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
      <div className="mt-1 flex">
        <PullRequestStatusIcon pullRequest={pullRequest} />
      </div>
      <div>
        <div>
          <a
            href={pullRequest.url}
            onClick={(event) => {
              event.stopPropagation();
            }}
            className="hover:bg-hover inline-flex items-center gap-2 rounded px-1"
          >
            <span className="flex min-w-0 max-w-prose items-center gap-2">
              <span className="min-w-0 flex-1 truncate">
                {pullRequest.title}
              </span>
              <span className="text-low font-normal">
                #{pullRequest.number}
              </span>
            </span>
          </a>
        </div>
        <div className="text-low flex items-center gap-1 px-1">
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

export const PullRequestButton = (props: {
  pullRequest: FragmentType<typeof PullRequestButtonFragment>;
  size?: ButtonSize;
  emulatedAnchor?: boolean;
  className?: string;
  target?: string;
}) => {
  const pullRequest = useFragment(PullRequestButtonFragment, props.pullRequest);
  const Anchor = props.emulatedAnchor ? EmulatedAnchor : "a";
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
        className={clsx("!bg-app min-w-0", props.className)}
      >
        {(buttonProps) => (
          <Anchor {...buttonProps} href={pullRequest.url} target={props.target}>
            <>
              <PullRequestStatusIcon pullRequest={pullRequest} />
              {pullRequest.title ? (
                <span className="flex min-w-0 max-w-prose items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">
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
