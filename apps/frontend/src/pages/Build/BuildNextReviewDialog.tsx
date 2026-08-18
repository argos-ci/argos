import { createContext, use, useEffect, useMemo } from "react";
import { invariant } from "@argos/util/invariant";

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

import { useProjectParams } from "../Project/ProjectParams";
import { getBuildOverviewURL } from "./BuildParams";
import { BuildStatsIndicator } from "./BuildStatsIndicator";

const _BuildFragment = graphql(`
  fragment BuildNextReviewDialog_Build on Build {
    siblingBuilds {
      id
      number
      name
      status
      subset
      viewerHasSubmittedReview
      stats {
        ...BuildStatsIndicator_BuildStats
      }
      ...BuildStatusChip_Build
    }
  }
`);

export type SiblingBuild = DocumentType<
  typeof _BuildFragment
>["siblingBuilds"][number];

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
  promptNextReview: (builds: SiblingBuild[]) => void;
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
  const dialog = useDialogValueState<SiblingBuild[] | null>(null);

  const promptNextReview = useEventCallback((builds: SiblingBuild[]) => {
    if (getBuildsAwaitingReview(builds).length === 0) {
      return;
    }
    dialog.open(builds);
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
          <BuildNextReviewDialog builds={dialog.value} />
        </Modal>
      ) : null}
      <BuildNextReviewDialogContext value={value}>
        {children}
      </BuildNextReviewDialogContext>
    </>
  );
}

function BuildNextReviewDialog(props: { builds: SiblingBuild[] }) {
  const { builds } = props;
  const projectParams = useProjectParams();
  invariant(projectParams, "The build page always has project params");
  const awaitingReview = getBuildsAwaitingReview(builds);
  const [nextBuild] = awaitingReview;
  invariant(nextBuild, "The dialog only opens when a build awaits a review");

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
          {builds.map((build) => (
            <ListRowLink
              key={build.id}
              href={getBuildOverviewURL({
                ...projectParams,
                buildNumber: build.number,
              })}
              className="flex items-center gap-4 p-3 text-sm"
            >
              {/*
               * Named by its build name, not its number: on one commit the
               * name is what tells the builds apart, and it is the same word
               * the reviewer configured in CI.
               */}
              <div className="w-28 shrink-0">
                <Truncable className="font-medium">{build.name}</Truncable>
                <div className="text-low mt-0.5 text-xs tabular-nums">
                  Build {build.number}
                </div>
              </div>
              <div className="w-44 shrink-0">
                <BuildStatusChip build={build} scale="sm" />
              </div>
              <div className="hidden grow justify-end sm:flex">
                {build.stats ? (
                  <BuildStatsIndicator
                    stats={build.stats}
                    isSubsetBuild={build.subset}
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
          href={getBuildOverviewURL({
            ...projectParams,
            buildNumber: nextBuild.number,
          })}
          autoFocus
        >
          Review {nextBuild.name}
        </LinkButton>
      </DialogFooter>
    </Dialog>
  );
}
