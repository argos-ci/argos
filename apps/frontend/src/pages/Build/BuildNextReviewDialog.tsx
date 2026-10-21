import { createContext, use, useId, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ChevronDownIcon } from "lucide-react";

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
import { List, ListRowButton, ListRowLink, ListTitle } from "@/ui/List";
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
  const awaitingReview = getBuildsAwaitingReview(build.siblingBuilds);
  const [nextBuild, ...otherBuilds] = awaitingReview;
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
        <BuildsToReview
          nextBuild={nextBuild}
          otherBuilds={otherBuilds}
          projectId={build.project.id}
        />
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
        <BuildsToReview
          nextBuild={newerBuild}
          otherBuilds={awaitingReview}
          projectId={build.project.id}
        />
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

/**
 * A commit can run dozens of suites. Past this many builds, the next one
 * included, the others fold behind a button.
 */
const VISIBLE_BUILDS_LIMIT = 5;

/**
 * The build the dialog's action leads to, set apart from the others still
 * awaiting a review. The action does not name it, so this is where the
 * reviewer sees which build they are about to land on.
 */
function BuildsToReview(props: {
  nextBuild: ListedBuild;
  otherBuilds: ListedBuild[];
  projectId: string;
}) {
  const { nextBuild, otherBuilds, projectId } = props;
  const nextTitleId = useId();
  const othersTitleId = useId();
  const [expanded, setExpanded] = useState(false);
  // A commit can spread its suites over several projects, and then the build
  // name alone stops being enough to tell them apart — both projects of a
  // monorepo call theirs `default`. Named only when it is somewhere else than
  // the project being reviewed, so the usual case stays quiet.
  const showProject = [nextBuild, ...otherBuilds].some(
    (build) => build.project.id !== projectId,
  );
  const unfoldedCount = VISIBLE_BUILDS_LIMIT - 1;
  const shownOtherBuilds = expanded
    ? otherBuilds
    : otherBuilds.slice(0, unfoldedCount);
  const foldedCount = otherBuilds.length - shownOtherBuilds.length;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <ListTitle id={nextTitleId}>Up next</ListTitle>
        <List
          aria-labelledby={nextTitleId}
          className="border-primary ring-primary ring-1"
        >
          <ListedBuildRow build={nextBuild} showProject={showProject} />
        </List>
      </div>
      {otherBuilds.length > 0 ? (
        <div>
          <ListTitle id={othersTitleId}>Also awaiting your review</ListTitle>
          <List aria-labelledby={othersTitleId}>
            {shownOtherBuilds.map((build, index) => (
              <ListedBuildRow
                key={build.id}
                ref={index === unfoldedCount ? focusOnMount : undefined}
                build={build}
                showProject={showProject}
              />
            ))}
            {foldedCount > 0 ? (
              <ListRowButton
                className="text-low hover:text-default flex items-center justify-center gap-1.5 p-3 text-sm"
                onClick={() => setExpanded(true)}
              >
                Show {foldedCount} more {foldedCount === 1 ? "build" : "builds"}
                <ChevronDownIcon className="size-4" />
              </ListRowButton>
            ) : null}
          </List>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Hands focus to the first build "Show more" revealed: the button leaves with
 * the click, and focus would otherwise fall back to the dialog. Declared at
 * module level so its identity is stable, since React calls a callback ref
 * again whenever it changes.
 */
function focusOnMount(element: HTMLElement | null) {
  element?.focus();
}

function ListedBuildRow(props: {
  ref?: React.Ref<HTMLAnchorElement>;
  build: ListedBuild;
  showProject: boolean;
}) {
  const { ref, build, showProject } = props;
  return (
    <ListRowLink
      ref={ref}
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
