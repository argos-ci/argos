import { createContext, use, useMemo } from "react";
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

const _ListedBuildFragment = graphql(`
  fragment BuildNextReviewDialog_ListedBuild on Build {
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
`);

const _BuildFragment = graphql(`
  fragment BuildNextReviewDialog_Build on Build {
    id
    branch
    project {
      id
      slug
    }
    pullRequest {
      id
      number
    }
    siblingBuilds {
      ...BuildNextReviewDialog_ListedBuild
      newerBuild {
        id
      }
    }
    newerBuild {
      ...BuildNextReviewDialog_ListedBuild
    }
  }
`);

type ListedBuild = DocumentType<typeof _ListedBuildFragment>;
type ReviewedBuild = DocumentType<typeof _BuildFragment>;
export type SiblingBuild = ReviewedBuild["siblingBuilds"][number];

/**
 * The builds still waiting for the viewer to make a call: nobody has concluded
 * them yet, the viewer hasn't weighed in either, and no later run of their
 * suite has replaced them. An outdated sibling is reviewed through the build
 * that replaced it.
 */
function getBuildsAwaitingReview(builds: SiblingBuild[]): SiblingBuild[] {
  return builds.filter(
    (build) =>
      build.status === BuildStatus.ChangesDetected &&
      !build.viewerHasSubmittedReview &&
      !build.newerBuild,
  );
}

/**
 * The build that replaced the reviewed one, when it leaves the viewer
 * something to do there: changes nobody has settled, or a run still going
 * that may bring some. A settled one is no reason to send the reviewer over.
 */
function getNewerBuildToReview(build: ReviewedBuild): ListedBuild | null {
  const { newerBuild } = build;
  if (!newerBuild || newerBuild.viewerHasSubmittedReview) {
    return null;
  }
  switch (newerBuild.status) {
    case BuildStatus.ChangesDetected:
    case BuildStatus.Pending:
    case BuildStatus.Progress:
      return newerBuild;
    default:
      return null;
  }
}

type ContextValue = {
  /**
   * Offer to move on: to the newer build of the same suite when the reviewed
   * one is outdated, otherwise to the next build of the same commit awaiting a
   * review. Does nothing when there is neither, the reviewer is done.
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
  children: React.ReactNode;
}) {
  const { children } = props;
  const dialog = useDialogValueState<ReviewedBuild | null>(null);

  const promptNextReview = useEventCallback((build: ReviewedBuild) => {
    if (
      !getNewerBuildToReview(build) &&
      getBuildsAwaitingReview(build.siblingBuilds).length === 0
    ) {
      return;
    }
    dialog.open(build);
  });
  const value = useMemo(() => ({ promptNextReview }), [promptNextReview]);

  // The prompt belongs to the build that was just reviewed, and it does not
  // outlive it: jumping to one of the siblings remounts the build page.
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
  const newerBuild = getNewerBuildToReview(build);
  if (newerBuild) {
    return <NewerBuildDialog build={build} newerBuild={newerBuild} />;
  }
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
            <ListedBuildRow
              key={sibling.id}
              build={sibling}
              showProject={showProject}
            />
          ))}
        </List>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Not now</DialogDismiss>
        <LinkButton
          href={getBuildOverviewURL(getBuildParams(nextBuild))}
          autoFocus
          // The dialog opens on its own once a review is submitted, so nothing
          // marks the link as focused for a pointer user. Keep the ring on.
          showFocusRing
        >
          Review next build
        </LinkButton>
      </DialogFooter>
    </Dialog>
  );
}

/**
 * Where the reviewer goes after reviewing a build their pull request or branch
 * has moved past: the latest build of the same suite. Opening it offers to
 * reapply the approvals just given, so only what changed since is left.
 *
 * The commit's other suites are listed too when they still await a review and
 * nothing replaced them: the new commit may not run every suite, and those
 * builds are still the latest of their own.
 */
function NewerBuildDialog(props: {
  build: ReviewedBuild;
  newerBuild: ListedBuild;
}) {
  const { build, newerBuild } = props;
  const awaitingReview = getBuildsAwaitingReview(build.siblingBuilds);
  const showProject = awaitingReview.some(
    (sibling) => sibling.project.id !== build.project.id,
  );
  const subject = (() => {
    if (build.pullRequest) {
      return `pull request #${build.pullRequest.number}`;
    }
    invariant(build.branch, "Only a build with a branch has a newer build");
    return `branch ${build.branch}`;
  })();

  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Review the latest build</DialogTitle>
        <DialogText>
          Build {newerBuild.number} is the latest of {subject}. Approvals that
          still apply can be reapplied there.
          {awaitingReview.length === 0
            ? null
            : awaitingReview.length === 1
              ? " Another suite of this commit still needs your review."
              : ` ${awaitingReview.length} other suites of this commit still need your review.`}
        </DialogText>
        <List>
          <ListedBuildRow build={newerBuild} showProject={showProject} />
          {awaitingReview.map((sibling) => (
            <ListedBuildRow
              key={sibling.id}
              build={sibling}
              showProject={showProject}
            />
          ))}
        </List>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Not now</DialogDismiss>
        <LinkButton
          href={getBuildOverviewURL(getBuildParams(newerBuild))}
          autoFocus
          // The dialog opens on its own once a review is submitted, so nothing
          // marks the link as focused for a pointer user. Keep the ring on.
          showFocusRing
        >
          Review latest build
        </LinkButton>
      </DialogFooter>
    </Dialog>
  );
}

function ListedBuildRow(props: { build: ListedBuild; showProject: boolean }) {
  const { build, showProject } = props;
  return (
    <ListRowLink
      href={getBuildOverviewURL(getBuildParams(build))}
      className="flex items-center gap-4 p-3 text-sm"
    >
      {/*
       * Named by its build name, not its number: on one commit the name is
       * what tells the builds apart, and it is the same word the reviewer
       * configured in CI.
       */}
      <div className={clsx("shrink-0", showProject ? "w-44" : "w-28")}>
        <Truncable className="font-medium">{build.name}</Truncable>
        <div className="text-low mt-0.5 text-xs">
          {showProject ? (
            <Truncable>{build.project.slug}</Truncable>
          ) : (
            <span className="tabular-nums">Build {build.number}</span>
          )}
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
  );
}
