import React from "react";

import { useAuthTokenPayload } from "@/containers/Auth";
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
 * Reminder that a build whose decision is already made can still be reviewed
 * again. Rendered only for viewers who actually have the right to review.
 */
function ReReviewNote(props: { canReview: boolean }) {
  if (!props.canReview) {
    return null;
  }
  return <> You can still review it if you need to revisit the decision.</>;
}

/**
 * Description of an approved build: who approved it — phrased in the first
 * person when the viewer is one of them — what that means (baseline or
 * merge-ready), and that it can still be reviewed again.
 */
function ApprovedDescription(props: { build: Build; canReview: boolean }) {
  const { build, canReview } = props;
  const authPayload = useAuthTokenPayload();
  const viewerId = authPayload?.account.id ?? null;
  const approvers = getApprovers(build);
  const viewerApproved =
    viewerId !== null && approvers.some((user) => user.id === viewerId);
  const others = approvers.filter((user) => user.id !== viewerId);

  const outcome =
    build.mode === BuildMode.Monitoring
      ? "This build is now eligible as a baseline for future comparisons."
      : "This build is considered safe to merge.";

  return (
    <Paragraph>
      {viewerApproved ? (
        <>
          You approved the changes
          {others.length > 0 ? (
            <>
              {" along with "}
              <UserMentionList users={others} />
            </>
          ) : null}
          .
        </>
      ) : (
        <>
          The changes were approved
          {approvers.length > 0 ? (
            <>
              {" by "}
              <UserMentionList users={approvers} />
            </>
          ) : null}
          .
        </>
      )}{" "}
      {outcome}
      <ReReviewNote canReview={canReview} />
    </Paragraph>
  );
}

function ChangesResume() {
  return (
    <Paragraph>
      <Emphasis>Changes were detected in this build.</Emphasis> Please review
      the snapshots and confirm whether these changes are expected.
    </Paragraph>
  );
}

export function BuildSummaryDescription({
  build,
  canReview,
}: {
  build: Build;
  canReview: boolean;
}) {
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
      return <ApprovedDescription build={build} canReview={canReview} />;

    case BuildStatus.Rejected:
      return (
        <Paragraph>
          The changes in this build were rejected.
          <ReReviewNote canReview={canReview} />
        </Paragraph>
      );

    case BuildStatus.NoChanges:
      return <Paragraph>All snapshots match the baseline.</Paragraph>;

    default:
      return null;
  }
}
