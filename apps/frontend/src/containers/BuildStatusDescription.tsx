import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildStatus, BuildType, ReviewState } from "@/gql/graphql";
import { Code } from "@/ui/Code";
import { Link } from "@/ui/Link";
import { buildStatusDescriptors } from "@/util/build";

import {
  BuildReviewersStatusList,
  getLatestActiveReviewByUser,
} from "./BuildReviewersStatusList";

const _BuildFragment = graphql(`
  fragment BuildStatusDescription_Build on Build {
    type
    status
    mode
    baseBranch
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

export function BuildStatusDescription(props: {
  build: DocumentType<typeof _BuildFragment>;
}) {
  const { build } = props;

  if (build.status === BuildStatus.Error) {
    return <>An error occurred while processing the build.</>;
  }

  if (build.status === BuildStatus.Expired) {
    if (build.parallel) {
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
                href="https://argos-ci.com/docs/parallel-testing#modes"
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
          The build was aborted because it took too long to receive all the
          batches.
          <br />
          Received {build.parallel.received}/{build.parallel.total} batches with
          nonce <span className="font-mono">{build.parallel.nonce}</span>.
        </>
      );
    }
    return <>Build has been killed because it took too much time.</>;
  }

  switch (build.type) {
    case BuildType.Orphan:
      switch (build.status) {
        case BuildStatus.Accepted: {
          return <ReviewDescription build={build} />;
        }
        case BuildStatus.Rejected:
          return <ReviewDescription build={build} />;
        default: {
          switch (build.mode) {
            case BuildMode.Ci:
              return (
                <ReviewDescription build={build}>
                  Comparing screenshot is not possible because no baseline build
                  was found.
                  <div className="my-4">
                    It may happens because:
                    <ul className="mt-2 ml-8 list-disc space-y-1">
                      <li>
                        No Argos build has been performed on the base branch
                        {build.baseBranch ? (
                          <>
                            {" "}
                            : <Code>{build.baseBranch}</Code>
                          </>
                        ) : null}
                        .
                      </li>
                      <li>
                        Argos can't find any commit ancestor that matches an
                        approved build. You may need to rebase your branch.
                      </li>
                    </ul>
                  </div>
                </ReviewDescription>
              );
            case BuildMode.Monitoring:
              return (
                <ReviewDescription build={build}>
                  This build has no comparison because no previous build has
                  been approved yet. To start comparing screenshots, you need to
                  approve this build.
                </ReviewDescription>
              );
            default:
              assertNever(build.mode);
          }
        }
      }

    // eslint-disable-next-line no-fallthrough
    case BuildType.Reference:
      return (
        <>
          This build was auto-approved because the branch is identified as an
          auto-approved one in project settings.
        </>
      );

    case BuildType.Check: {
      switch (build.status) {
        case BuildStatus.NoChanges: {
          invariant(build.stats, "Concluded build should have stats");
          if (build.stats.total === 0) {
            return (
              <>
                No screenshot has been uploaded. Follow one of our{" "}
                <Link href="https://argos-ci.com/docs/getting-started">
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
          return <ReviewDescription build={build} />;
        case BuildStatus.Rejected:
          return <ReviewDescription build={build} />;
        case BuildStatus.Pending:
          return <>This build is scheduled to be processed.</>;
        default:
          assertNever(build.status);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case BuildType.Skipped: {
      return <>This build has been skipped in your CI configuration.</>;
    }

    case undefined:
    case null: {
      switch (build.status) {
        case BuildStatus.Pending:
          return <>This build is scheduled to be processed.</>;
      }
      return null;
    }
    default:
      assertNever(build.type);
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
    <div className="max-w-sm">
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
          <h3 className="mb-1 text-xs font-semibold">Reviewers</h3>
          <BuildReviewersStatusList
            reviews={reviewers}
            itemClassName="py-2 text-xs"
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
