import { createContext, use, useEffect, useMemo } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";

import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { DocumentType, graphql } from "@/gql";
import { BuildStatus } from "@/gql/graphql";
import { LinkButton } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useDialogValueState,
} from "@/ui/Dialog";
import { List, ListRowLink } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";

import { getBuildOverviewURL, getBuildParams } from "./BuildParams";
import { BuildStatsIndicator } from "./BuildStatsIndicator";

const _BuildFragment = graphql(`
  fragment BuildNextReviewDialog_Build on Build {
    id
    project {
      id
      slug
    }
    siblingBuilds {
      id
      number
      name
      status
      subset
      viewerHasSubmittedReview
      project {
        id
        slug
        name
        account {
          id
          slug
        }
      }
      stats {
        ...BuildStatsIndicator_BuildStats
      }
      ...BuildStatusChip_Build
    }
  }
`);

type ReviewedBuild = DocumentType<typeof _BuildFragment>;
export type SiblingBuild = ReviewedBuild["siblingBuilds"][number];

/**
 * The builds still waiting for the viewer to make a call: nobody has concluded
 * them yet, and the viewer hasn't weighed in either.
 */
function getBuildsAwaitingReview(builds: SiblingBuild[]): SiblingBuild[] {
  return builds.filter(
    (build) =>
      build.status === BuildStatus.ChangesDetected &&
      !build.viewerHasSubmittedReview,
  );
}

type ContextValue = {
  /**
   * Offer to move on to the next build of the same commit awaiting a review.
   * Does nothing when there is none — the reviewer is done with this commit.
   */
  promptNextReview: (build: ReviewedBuild) => void;
};

const BuildNextReviewDialogContext = createContext<ContextValue | null>(null);

export function useBuildNextReviewPrompt(): ContextValue {
  const context = use(BuildNextReviewDialogContext);
  invariant(
    context,
    "useBuildNextReviewPrompt must be called in BuildNextReviewDialogProvider",
  );
  return context;
}

export function BuildNextReviewDialogProvider(props: {
  buildNumber: number;
  children: React.ReactNode;
}) {
  const { buildNumber, children } = props;
  const dialog = useDialogValueState<ReviewedBuild | null>(null);

  const promptNextReview = useEventCallback((build: ReviewedBuild) => {
    if (getBuildsAwaitingReview(build.siblingBuilds).length === 0) {
      return;
    }
    dialog.open(build);
  });
  const value = useMemo(() => ({ promptNextReview }), [promptNextReview]);

  // The prompt belongs to the build that was just reviewed. Jumping to another
  // build keeps this provider mounted (same route, different param), so close
  // the dialog by hand — otherwise it outlives the navigation and keeps
  // offering the previous build's siblings.
  const close = useEventCallback(() => dialog.onOpenChange(false));
  useEffect(() => {
    close();
  }, [buildNumber, close]);

  return (
    <>
      {dialog.value ? (
        <Modal
          open={dialog.isOpen}
          onOpenChange={dialog.onOpenChange}
          dismissible
        >
          <BuildNextReviewDialog build={dialog.value} />
        </Modal>
      ) : null}
      <BuildNextReviewDialogContext value={value}>
        {children}
      </BuildNextReviewDialogContext>
    </>
  );
}

function BuildNextReviewDialog(props: { build: ReviewedBuild }) {
  const { build } = props;
  const builds = build.siblingBuilds;
  const awaitingReview = getBuildsAwaitingReview(builds);
  const [nextBuild] = awaitingReview;
  invariant(nextBuild, "The dialog only opens when a build awaits a review");
  // A commit can spread its suites over several projects, and then the build
  // name alone stops being enough to tell them apart — both projects of a
  // monorepo call theirs `default`. Named only when it is somewhere else than
  // the project being reviewed, so the usual case stays quiet.
  const showProject = builds.some(
    (sibling) => sibling.project.id !== build.project.id,
  );

  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Review the next build</DialogTitle>
        <DialogText>
          {awaitingReview.length === 1
            ? "One more build ran on this commit and still needs your review."
            : `${awaitingReview.length} more builds ran on this commit and still need your review.`}
        </DialogText>
        <List>
          {builds.map((sibling) => (
            <ListRowLink
              key={sibling.id}
              href={getBuildOverviewURL(getBuildParams(sibling))}
              className="flex items-center gap-4 p-3 text-sm"
            >
              {/*
               * Named by its build name, not its number: on one commit the
               * name is what tells the builds apart, and it is the same word
               * the reviewer configured in CI.
               */}
              <div className={clsx("shrink-0", showProject ? "w-44" : "w-28")}>
                <Truncable className="font-medium">{sibling.name}</Truncable>
                <div className="text-low mt-0.5 text-xs">
                  {showProject ? (
                    <Truncable>{sibling.project.slug}</Truncable>
                  ) : (
                    <span className="tabular-nums">Build {sibling.number}</span>
                  )}
                </div>
              </div>
              <div className="w-44 shrink-0">
                <BuildStatusChip build={sibling} scale="sm" />
              </div>
              <div className="hidden grow justify-end sm:flex">
                {sibling.stats ? (
                  <BuildStatsIndicator
                    stats={sibling.stats}
                    isSubsetBuild={sibling.subset}
                    className="flex-wrap justify-end"
                  />
                ) : null}
              </div>
            </ListRowLink>
          ))}
        </List>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Not now</DialogDismiss>
        <LinkButton
          href={getBuildOverviewURL(getBuildParams(nextBuild))}
          autoFocus
        >
          Review {nextBuild.name}
        </LinkButton>
      </DialogFooter>
    </Dialog>
  );
}
