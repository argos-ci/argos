import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildStatus, BuildType, ReviewState } from "@/gql/graphql";
import { Code } from "@/ui/Code";
import { Link } from "@/ui/Link";
import { buildStatusDescriptors } from "@/util/build";
import { getLatestActiveReviewByUser } from "@/util/build-review";

import { BuildReviewersStatusList } from "./BuildReviewersStatusList";

const _BuildFragment = graphql(`
  fragment BuildStatusDescription_Build on Build {
    type
    status
    mode
    stats {
      total
    }
    parallel {
      total
      received
      nonce
    }
    ...ReviewDescription_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

/**
 * One-line (or short) description of a build's current status, dispatched by
 * build type. Terminal error/expired states are handled first since they cut
 * across every type; the per-type descriptions live in their own components.
 */
export function BuildStatusDescription(props: { build: Build }) {
  const { build } = props;

  if (build.status === BuildStatus.Error) {
    return <>An error occurred while processing the build.</>;
  }

  if (build.status === BuildStatus.Expired) {
    return <ExpiredBuildDescription build={build} />;
  }

  switch (build.type) {
    case BuildType.Orphan:
      return <OrphanBuildDescription build={build} />;

    case BuildType.Reference:
      return (
        <>
          This build was auto-approved because the branch is identified as an
          auto-approved one in project settings.
        </>
      );

    case BuildType.Check:
      return <CheckBuildDescription build={build} />;

    case BuildType.Skipped:
      return <>This build has been skipped in your CI configuration.</>;

    case undefined:
    case null:
      return build.status === BuildStatus.Pending ? (
        <>This build is scheduled to be processed.</>
      ) : null;

    default:
      assertNever(build.type);
  }
}

/** Why an expired build stopped — distinguishes the parallel finalize cases. */
function ExpiredBuildDescription(props: { build: Build }) {
  const { build } = props;
  if (!build.parallel) {
    return <>Build has been killed because it took too much time.</>;
  }

  if (build.parallel.total === -1) {
    return (
      <>
        <div>
          This build expired while waiting for <Code>argos finalize</Code>.
        </div>
        <div>
          <Link
            external
            target="_blank"
            href="https://argos-ci.com/docs/learn/how-to-guides/ci-pipelines/parallel-testing-sharding#modes"
          >
            How to finalize in manual mode
          </Link>
        </div>

        <div className="text-low mt-1">
          Received {build.parallel.received} batch
          {build.parallel.received === 1 ? "" : "es"} for nonce{" "}
          <span className="font-mono">{build.parallel.nonce}</span>.
        </div>
      </>
    );
  }

  return (
    <>
      The build was aborted because it took too long to receive all the batches.
      <br />
      Received {build.parallel.received}/{build.parallel.total} batches with
      nonce <span className="font-mono">{build.parallel.nonce}</span>.
    </>
  );
}

/** Orphan builds: reviewed outcome, or why there is no baseline to compare. */
function OrphanBuildDescription(props: { build: Build }) {
  const { build } = props;
  switch (build.status) {
    case BuildStatus.Accepted:
    case BuildStatus.Rejected:
      return <ReviewDescription build={build} />;

    case BuildStatus.Pending:
    case BuildStatus.Progress:
    case BuildStatus.NoChanges:
    case BuildStatus.Aborted:
    case BuildStatus.ChangesDetected:
    case BuildStatus.Error:
    case BuildStatus.Expired:
      switch (build.mode) {
        case BuildMode.Ci:
          return (
            <ReviewDescription build={build}>
              Comparing screenshot is not possible because no baseline build was
              found.
            </ReviewDescription>
          );

        case BuildMode.Monitoring:
          return (
            <ReviewDescription build={build}>
              This build has no comparison because no previous build has been
              approved yet. To start comparing screenshots, you need to approve
              this build.
            </ReviewDescription>
          );

        default:
          assertNever(build.mode);
      }

    // eslint-disable-next-line no-fallthrough
    default:
      assertNever(build.status);
  }
}

/** Check builds: the common CI path (stable / changes / reviewed / running). */
function CheckBuildDescription(props: { build: Build }) {
  const { build } = props;
  switch (build.status) {
    case BuildStatus.NoChanges: {
      invariant(build.stats, "Concluded build should have stats");
      if (build.stats.total === 0) {
        return (
          <>
            No screenshot has been uploaded. Follow one of our{" "}
            <Link href="https://argos-ci.com/docs/quickstart">
              quick start guides
            </Link>{" "}
            to start taking screenshots.
          </>
        );
      }

      return <>This build is stable: no changes found.</>;
    }

    case BuildStatus.Aborted:
      return <>This build has been voluntarily aborted.</>;

    case BuildStatus.ChangesDetected:
      return (
        <ReviewDescription build={build}>
          Some changes have been detected between baseline and current
          screenshots.
        </ReviewDescription>
      );

    case BuildStatus.Progress:
      return <>This build is in progress.</>;

    case BuildStatus.Accepted:
    case BuildStatus.Rejected:
      return <ReviewDescription build={build} />;

    case BuildStatus.Pending:
      return <>This build is scheduled to be processed.</>;

    // Handled before dispatching on type; listed to keep the switch exhaustive.

    case BuildStatus.Error:
    case BuildStatus.Expired:
      return null;

    default:
      assertNever(build.status);
  }
}

const _ReviewDescriptionBuildFragment = graphql(`
  fragment ReviewDescription_Build on Build {
    status
    reviews {
      id
      date
      state
      dismissedAt
      automatic
      user {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
  }
`);

function ReviewDescription(props: {
  build: DocumentType<typeof _ReviewDescriptionBuildFragment>;
  children?: React.ReactNode;
}) {
  const { build, children } = props;
  const descriptor = buildStatusDescriptors[build.status];
  const reviewers = getLatestActiveReviewByUser(build.reviews);
  const description = getReviewStatusDescription(build.status, reviewers);
  return (
    <div className="max-w-xs">
      {description ? (
        <p className="mb-4">
          This build is <strong>{descriptor.label}</strong> {description}.
        </p>
      ) : children ? (
        <div className={reviewers.length > 0 ? "mb-4" : undefined}>
          {children}
        </div>
      ) : null}
      {reviewers.length > 0 ? (
        <div className="rounded-sm border p-2">
          <h3 className="mb-2 text-xs font-semibold">Reviewers</h3>
          <BuildReviewersStatusList
            reviews={reviewers}
            className="gap-2"
            itemClassName="text-xs"
            avatarClassName="size-4"
          />
        </div>
      ) : null}
    </div>
  );
}

type Review = DocumentType<
  typeof _ReviewDescriptionBuildFragment
>["reviews"][number];

function getReviewStatusDescription(
  status: BuildStatus,
  reviews: readonly Review[],
) {
  switch (status) {
    case BuildStatus.Rejected: {
      const names = getReviewerNamesByState(reviews, ReviewState.Rejected);
      return names ? <>because {names} rejected it</> : null;
    }
    case BuildStatus.Accepted: {
      const names = getReviewerNamesByState(reviews, ReviewState.Approved);
      return names ? <>because {names} approved it</> : null;
    }
    default:
      return null;
  }
}

function getReviewerNamesByState(
  reviews: readonly Review[],
  state: ReviewState,
) {
  const names = reviews
    .filter((review) => review.state === state)
    .map((review) => review.user?.name || review.user?.slug)
    .filter((name) => name !== undefined);
  if (names.length === 0) {
    return null;
  }
  return formatReviewerNames(names);
}

function formatReviewerNames(names: readonly string[]) {
  return names.flatMap((name, index) => {
    const parts: React.ReactNode[] = [];
    if (index > 0) {
      parts.push(index === names.length - 1 ? " and " : ", ");
    }
    parts.push(<strong key={name}>{name}</strong>);
    return parts;
  });
}
