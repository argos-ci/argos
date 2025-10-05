import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";

import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildStatus, BuildType } from "@/gql/graphql";
import { Code } from "@/ui/Code";
import { Link } from "@/ui/Link";
import { Time } from "@/ui/Time";
import { buildStatusDescriptors } from "@/util/build";
import { buildReviewDescriptors } from "@/util/build-review";

import { AccountAvatar } from "./AccountAvatar";

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

  if (build.status === BuildStatus.Expired) {
    if (build.parallel) {
      if (build.parallel.total === -1) {
        return (
          <>
            The build was aborted because it took too long to be finalized.
            <br />
            Received {build.parallel.received} batches with nonce{" "}
            <span className="font-mono">{build.parallel.nonce}</span>.
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
                <>
                  Comparing screenshot is not possible because no baseline build
                  was found.
                  <div className="my-4">
                    It may happens because:
                    <ul className="ml-8 mt-2 list-disc space-y-1">
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
                </>
              );
            case BuildMode.Monitoring:
              return (
                <>
                  This build has no comparison because no previous build has
                  been approved yet. To start comparing screenshots, you need to
                  approve this build.
                </>
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

        case BuildStatus.Error:
          return <>The build has failed to be processed.</>;

        case BuildStatus.Aborted:
          return <>This build has been voluntarily aborted.</>;

        case BuildStatus.ChangesDetected:
          return (
            <>
              Some changes have been detected between baseline and current
              screenshots.
            </>
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
        case BuildStatus.Error:
          return <>The build has failed to be processed.</>;
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
}) {
  const { build } = props;
  const descriptor = buildStatusDescriptors[build.status];
  return (
    <div className="max-w-sm">
      <p className="mb-4">
        This build is <strong>{descriptor.label}</strong> based on the state of
        its latest review.
      </p>
      <div className="rounded-sm border p-2 pb-0">
        <h3 className="mb-1 text-xs font-semibold">Reviews</h3>
        <ul className="flex flex-col text-sm">
          {build.reviews.map((review) => {
            const descriptor = buildReviewDescriptors[review.state];
            const Icon = descriptor.icon;
            return (
              <li
                className="flex items-center gap-3 border-b py-2 text-xs last:border-b-0"
                key={review.id}
              >
                <div className="flex items-center">
                  <Icon
                    className={clsx("size-3 shrink-0", descriptor.textColor)}
                  />
                  &nbsp;
                  <strong className="w-14">{descriptor.label}</strong>
                </div>
                <div className="text-low">—</div>
                <div className="flex items-center">
                  <Time date={review.date} tooltip="title" />
                  {review.user && (
                    <>
                      &nbsp;by&nbsp;
                      <AccountAvatar
                        className="size-4 shrink-0"
                        avatar={review.user.avatar}
                      />
                      &nbsp;{review.user.name || review.user.slug}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
