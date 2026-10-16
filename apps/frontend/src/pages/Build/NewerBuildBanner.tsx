import { useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { AlertTriangleIcon, HistoryIcon } from "lucide-react";

import { useRefetchWhenActive } from "@/containers/Apollo";
import { graphql } from "@/gql";
import { BuildStatus } from "@/gql/graphql";
import { Banner } from "@/ui/Banner";
import { Link } from "@/ui/Link";

import {
  getBuildOverviewURL,
  getBuildParams,
  type BuildParams,
} from "./BuildParams";
import { useBuildReviewState } from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";

const NewerBuildQuery = graphql(`
  query NewerBuildBanner_build(
    $accountSlug: String!
    $projectName: String!
    $buildNumber: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      build(number: $buildNumber) {
        id
        commit
        branch
        viewerHasSubmittedReview
        pullRequest {
          id
          number
        }
        newerBuild {
          id
          number
          status
          commit
          project {
            id
            name
            account {
              id
              slug
            }
          }
        }
        # Read along for the build switcher, which has the same blind spot: a
        # suite that starts once this build is done only shows up on reload.
        ...BuildSwitcher_Build
      }
    }
  }
`);

/**
 * Slow on purpose. Coming back to the tab already refetches, and that is the
 * case this exists for: a build left open in a tab while the pull request
 * moved on. Polling only covers the reviewer who never looks away.
 */
const POLL_INTERVAL = 60_000;

/**
 * Whether the viewer has started marking snapshots of this build, so is
 * spending a review on it.
 */
function useHasReviewMarks(): boolean {
  const state = useBuildReviewState();
  if (!state) {
    return false;
  }
  return Object.values(state.diffStatuses).some(
    (status) => status !== EvaluationStatus.Pending,
  );
}

function getMessage(input: {
  /** Where the newer build ran: "pull request #12" or "branch feat/x". */
  subject: string;
  /** The newer build ran on the same commit: CI ran the suite again. */
  rerun: boolean;
  running: boolean;
  reviewing: boolean;
}): string {
  const { subject, rerun, running, reviewing } = input;
  if (reviewing) {
    return rerun
      ? "You're reviewing an older run of this commit."
      : `You're reviewing an older build of ${subject}.`;
  }
  if (rerun) {
    return running
      ? "This commit is being built again."
      : "This commit was built again.";
  }
  return running
    ? `A newer build is running for ${subject}.`
    : `A newer build exists for ${subject}.`;
}

/**
 * Tells the viewer they are not looking at the latest build of this suite on
 * its branch or pull request, and links to the one that is. A build page left
 * open in a tab says nothing of the commits pushed since, and reviewing it
 * settles the status of a commit the pull request no longer points to.
 */
export function NewerBuildBanner(props: { params: BuildParams }) {
  const { params } = props;
  const { data, refetch } = useQuery(NewerBuildQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      buildNumber: params.buildNumber,
    },
    pollInterval: POLL_INTERVAL,
    skipPollAttempt: () => document.hidden,
  });
  useRefetchWhenActive({ refetch });
  const hasReviewMarks = useHasReviewMarks();

  const build = data?.project?.build ?? null;
  const newerBuild = build?.newerBuild ?? null;
  if (!build || !newerBuild) {
    return null;
  }

  const subject = (() => {
    if (build.pullRequest) {
      return `pull request #${build.pullRequest.number}`;
    }
    invariant(build.branch, "Only a build with a branch has a newer build");
    return `branch ${build.branch}`;
  })();
  const reviewing = hasReviewMarks && !build.viewerHasSubmittedReview;
  const Icon = reviewing ? AlertTriangleIcon : HistoryIcon;

  return (
    <Banner
      className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b"
      color={reviewing ? "warning" : "info"}
    >
      <Icon className="size-4 shrink-0" />
      <span>
        {getMessage({
          subject,
          rerun: newerBuild.commit === build.commit,
          running:
            newerBuild.status === BuildStatus.Pending ||
            newerBuild.status === BuildStatus.Progress,
          reviewing,
        })}
      </span>
      <Link href={getBuildOverviewURL(getBuildParams(newerBuild))}>
        Go to build {newerBuild.number}
      </Link>
    </Banner>
  );
}
