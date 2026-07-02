import React from "react";

import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildStatus, BuildType, ReviewState } from "@/gql/graphql";
import { getUserCardData, UserMention } from "@/ui/UserCard";
import { getLatestActiveReviewByUser } from "@/util/build-review";
import { formatNameList } from "@/util/nameList";

import { useBuildDiffState } from "../BuildDiffState";
import { BranchTag, Emphasis } from "./shared";

const _BuildFragment = graphql(`
  fragment BuildSummaryDescription_Build on Build {
    type
    status
    mode
    branch
    baseBranch
    reviews {
      id
      date
      state
      dismissedAt
      user {
        id
        ...UserCard_user
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type ReviewUser = NonNullable<Build["reviews"][number]["user"]>;

function Paragraph(props: { children: React.ReactNode }) {
  return <p className="mt-2">{props.children}</p>;
}

/**
 * The people whose active (non-dismissed) approvals stand behind an approved
 * build, most recent first, each counted once.
 */
function getApprovers(build: Build): ReviewUser[] {
  return getLatestActiveReviewByUser(build.reviews)
    .filter((review) => review.state === ReviewState.Approved && review.user)
    .map((review) => review.user as ReviewUser);
}

/** A list of users rendered as mentions, collapsed to "A, B and N others". */
function UserMentionList(props: { users: ReviewUser[] }) {
  return (
    <>
      {formatNameList(props.users, { max: 2 }).map((segment, index) =>
        segment.type === "item" ? (
          <UserMention
            key={segment.item.id}
            user={getUserCardData(segment.item)}
          />
        ) : (
          <React.Fragment key={`sep-${index}`}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  );
}

/**
 * " by <names>" credit for an approved build, or nothing when no approver is
 * known. Names beyond the first two collapse into "and N others".
 */
function ApprovalCredit(props: { build: Build }) {
  const approvers = getApprovers(props.build);
  if (approvers.length === 0) {
    return null;
  }
  return (
    <>
      {" by "}
      <UserMentionList users={approvers} />
    </>
  );
}

function ChangesResume() {
  return (
    <Paragraph>
      <Emphasis>Changes were detected in this build.</Emphasis> Please review
      the screenshots and confirm whether these changes are expected.
    </Paragraph>
  );
}

export function BuildSummaryDescription({ build }: { build: Build }) {
  const { stats } = useBuildDiffState();
  const hasFailures = stats && Boolean(stats.failure);

  if (build.type === BuildType.Orphan) {
    return (
      <>
        <Paragraph>Argos has nothing to compare this build against.</Paragraph>
        <Paragraph>
          This is expected for a project's first builds. Otherwise, it usually
          means{" "}
          <BranchTag name={build.baseBranch} fallback="your base branch" />{" "}
          doesn't have an Argos build yet that this branch can compare against.
        </Paragraph>
      </>
    );
  }

  if (hasFailures) {
    return (
      <>
        <Paragraph>
          <Emphasis className="text-danger-low">
            {stats.failure} test{stats.failure > 1 ? "s" : ""} failed in this
            build.
          </Emphasis>{" "}
          Its screenshots may be incomplete or show a broken state, so reviewing
          the changes won't be meaningful.
        </Paragraph>
        <Paragraph>
          The failure screenshots below reveal what went wrong — fix the
          underlying issues and re-run your tests to get a build worth
          comparing.
        </Paragraph>
      </>
    );
  }

  if (build.type === BuildType.Reference) {
    return (
      <Paragraph>
        This build ran on{" "}
        <BranchTag name={build.branch} fallback="your base branch" />, so it now
        serves as the baseline that future builds are compared against.
      </Paragraph>
    );
  }

  switch (build.status) {
    case BuildStatus.ChangesDetected:
      return <ChangesResume />;

    case BuildStatus.Accepted:
      return build.mode === BuildMode.Monitoring ? (
        <Paragraph>
          The changes were approved
          <ApprovalCredit build={build} />. This build is now eligible as a
          baseline for future comparisons.
        </Paragraph>
      ) : (
        <Paragraph>
          The changes were approved
          <ApprovalCredit build={build} />, it means this build is considered
          safe to be merged.
        </Paragraph>
      );

    case BuildStatus.Rejected:
      return <Paragraph>The changes in this build were rejected.</Paragraph>;

    case BuildStatus.NoChanges:
      return <Paragraph>All screenshots match the baseline.</Paragraph>;

    default:
      return null;
  }
}
