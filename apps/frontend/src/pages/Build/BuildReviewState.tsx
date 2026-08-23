import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { invariant } from "@argos/util/invariant";
import { atomFamily } from "jotai-family";
import { useAtom } from "jotai/react";
import { atomWithStorage } from "jotai/utils";

import {
  BuildReviewEvent,
  BuildStatus,
  BuildType,
  ScreenshotDiffStatus,
} from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";
import { useLiveRef } from "@/ui/useLiveRef";

import {
  checkDiffCanBeReviewed,
  Diff,
  getReviewableCount,
  useBuildDiffState,
  useGetNextDiff,
  type UseGetNextDiffOptions,
} from "./BuildDiffState";
import { BuildParams } from "./BuildParams";
import { useReviewDialog } from "./BuildReviewDialog";
import { EvaluationStatus } from "./EvaluationStatus";

type BuildReviewStateValue = {
  /**
   * Map of diff IDs to their evaluation status.
   */
  diffStatuses: Record<Diff["id"], EvaluationStatus>;

  /**
   * The status of the build.
   */
  buildStatus: BuildStatus | null;
};

const BuildReviewStateContext = createContext<BuildReviewStateValue | null>(
  null,
);

export function useBuildReviewState() {
  return use(BuildReviewStateContext);
}

export type BuildReviewAPI = {
  /**
   * Set the evaluation status of the diffs.
   */
  setDiffStatuses: React.Dispatch<
    React.SetStateAction<Record<Diff["id"], EvaluationStatus>>
  >;

  /**
   * Get the current evaluation status of all diffs.
   * Similar to `state.diffStatuses`, but do not re-render the component.
   */
  getDiffStatuses: () => Record<Diff["id"], EvaluationStatus>;

  /**
   * Mark diffs, keeping the change on the undo stack. The way to evaluate a
   * diff: `setDiffStatuses` writes statuses the reviewer cannot take back.
   */
  markDiffs: (diffIds: Diff["id"][], status: EvaluationStatus) => void;

  /** Revert the last marking. Returns what it wrote, or null if there is none. */
  undo: () => AppliedReviewMarkChange | null;

  /** Re-apply the last reverted marking. Returns what it wrote, or null. */
  redo: () => AppliedReviewMarkChange | null;

  /**
   * Forget what can be undone, because the marks it describes are no longer
   * the reviewer's to take back.
   */
  clearHistory: () => void;
};

const BuildReviewAPIContext = createContext<BuildReviewAPI | null>(null);

/**
 * One step of the undo stack: the statuses a single marking replaced, and the
 * ones it wrote. Only the diffs it touched are stored, so undoing never
 * resurrects marks it left alone.
 */
type ReviewMarkChange = {
  /** Statuses to restore when the change is undone, keyed by diff id. */
  before: Record<Diff["id"], EvaluationStatus>;
  /** Statuses to restore when the change is redone, keyed by diff id. */
  after: Record<Diff["id"], EvaluationStatus>;
  /**
   * Diff to bring back on screen when the change is undone or redone, so the
   * reviewer looks at what just moved. For a group, its first diff.
   */
  diffId: Diff["id"];
};

/** What an undo or a redo wrote, for the caller to report and navigate to. */
export type AppliedReviewMarkChange = {
  /** Statuses it wrote. */
  statuses: Record<Diff["id"], EvaluationStatus>;
  /** Statuses it replaced, so the caller can tell which way it moved. */
  replaced: Record<Diff["id"], EvaluationStatus>;
  diffId: Diff["id"];
};

/** The two stacks, scoped to the build they were recorded on. */
type ReviewMarkStacks = {
  buildKey: string;
  undo: ReviewMarkChange[];
  redo: ReviewMarkChange[];
};

/**
 * How many markings can be walked back. Reviewing is a linear pass over the
 * changed snapshots, so a mistake is caught within a few keystrokes; the cap
 * only keeps a very long session from growing the stacks forever.
 */
const MAX_HISTORY_LENGTH = 50;

/**
 * Get the current review status of all diffs.
 * - "initializing": The review state is not yet initialized.
 * - "pending": Some diffs are not reviewed yet.
 * - "complete": All diffs are reviewed.
 */
function useReviewStatus(): "initializing" | "pending" | "complete" | null {
  const { stats, isSubsetBuild } = useBuildDiffState();
  const state = use(BuildReviewStateContext);
  const diffStatuses = state?.diffStatuses ?? null;
  return useMemo(() => {
    if (!diffStatuses) {
      return null;
    }

    if (!stats) {
      return "initializing";
    }
    const expected = getReviewableCount(stats, { isSubsetBuild });
    const reviewed = Object.values(diffStatuses).filter(
      (status) => status !== EvaluationStatus.Pending,
    ).length;
    return expected === reviewed ? "complete" : "pending";
  }, [stats, diffStatuses, isSubsetBuild]);
}

export function useBuildReviewAPI(): BuildReviewAPI | null {
  return use(BuildReviewAPIContext);
}

/**
 * Acknowledge the current diff and move to the next diff or show the review dialog.
 */
export function useAcknowledgeMarkedDiff(
  options?: UseGetNextDiffOptions & {
    /**
     * Resolve the next diff once the status update has landed instead of
     * snapshotting it at plan time. Required when marking several diffs at
     * once: a plan-time snapshot still sees them as pending and would
     * navigate to one of them.
     */
    resolveNextDiffOnAck?: boolean;
  },
) {
  const getDiffStatus = useGetDiffEvaluationStatus();
  const reviewStatus = useReviewStatus();
  const { setActiveDiff, isSubsetBuild, diffs, isLoading } =
    useBuildDiffState();
  const getNextDiff = useGetNextDiff((diff) => {
    if (!getDiffStatus) {
      return false;
    }
    return (
      checkDiffCanBeReviewed(diff.status, { isSubsetBuild }) &&
      getDiffStatus(diff.id) === EvaluationStatus.Pending
    );
  }, options);
  const reviewDialog = useReviewDialog();
  const state = use(BuildReviewStateContext);
  const diffStatuses = state?.diffStatuses ?? null;
  const diffStatusesRef = useRef<Record<string, EvaluationStatus> | null>(null);
  const nextDiffRef = useRef<Diff | null>(null);

  // Navigate to the next diff to review, or show the review dialog once every
  // diff has been reviewed. `reviewStatus` is read fresh at call time, so the
  // diff that was just marked is already accounted for.
  const acknowledgeNextDiff = useEventCallback((nextDiff: Diff | null) => {
    if (reviewStatus === "complete") {
      reviewDialog.show();
    } else if (
      nextDiff &&
      checkDiffCanBeReviewed(nextDiff.status, { isSubsetBuild })
    ) {
      setActiveDiff(nextDiff, true);
    }
  });

  const resolveNextDiffOnAck = options?.resolveNextDiffOnAck ?? false;

  const acknowledge = useEventCallback(() => {
    // With `resolveNextDiffOnAck`, the updated statuses and re-sorted list are
    // committed by the time this runs, so the next diff is computed against
    // them rather than read from the plan-time snapshot.
    acknowledgeNextDiff(
      resolveNextDiffOnAck ? getNextDiff() : nextDiffRef.current,
    );
  });

  useEffect(() => {
    if (diffStatusesRef.current && diffStatuses !== diffStatusesRef.current) {
      // In resolve-on-ack mode the next diff to review may simply not be
      // loaded yet — hold the acknowledgment until more of the list arrives
      // (`diffs` is a dependency) or it is fully loaded.
      if (resolveNextDiffOnAck && isLoading && !getNextDiff()) {
        return;
      }
      diffStatusesRef.current = null;
      acknowledge();
    }
  }, [
    diffStatuses,
    acknowledge,
    resolveNextDiffOnAck,
    isLoading,
    getNextDiff,
    diffs,
  ]);

  const planAck = useEventCallback(() => {
    diffStatusesRef.current = diffStatuses;
    nextDiffRef.current = resolveNextDiffOnAck ? null : getNextDiff();
  });

  // Snapshot the next diff to review *now* — before marking re-sorts the list —
  // but defer the navigation to the returned callback instead of firing it on
  // the next render. Used by the reject-note dialog so moving to the next diff
  // waits until the reviewer submits or skips the note.
  const planDeferredAck = useEventCallback(() => {
    const nextDiff = getNextDiff();
    return () => acknowledgeNextDiff(nextDiff);
  });

  const checkIsPending = useEventCallback(() => {
    return Boolean(diffStatusesRef.current);
  });

  return [checkIsPending, planAck, planDeferredAck] as const;
}

/**
 * Get the summary of the review status.
 * Diffs are grouped by their evaluation status.
 */
export function useBuildReviewSummary(): Record<
  EvaluationStatus,
  Diff[]
> | null {
  const state = use(BuildReviewStateContext);
  const { diffs } = useBuildDiffState();
  const diffStatuses = state?.diffStatuses ?? null;
  return useMemo(() => {
    if (!diffStatuses) {
      return null;
    }
    return Object.entries(diffStatuses).reduce<
      Record<EvaluationStatus, Diff[]>
    >(
      (summary, [diffId, status]) => {
        const diff = diffs.find((diff) => diff.id === diffId);
        if (!diff) {
          return summary;
        }
        summary[status].push(diff);
        return summary;
      },
      {
        [EvaluationStatus.Accepted]: [],
        [EvaluationStatus.Rejected]: [],
        [EvaluationStatus.Pending]: [],
      },
    );
  }, [diffStatuses, diffs]);
}

/**
 * Get the current evaluation status of the diff.
 */
export function useGetDiffEvaluationStatus():
  | ((diffId: string) => EvaluationStatus)
  | null {
  const state = use(BuildReviewStateContext);
  const diffStatuses = state?.diffStatuses ?? null;
  return useMemo(() => {
    if (!diffStatuses) {
      return null;
    }

    return (diffId: string) => {
      return diffStatuses[diffId] ?? EvaluationStatus.Pending;
    };
  }, [diffStatuses]);
}

/**
 * Get the current evaluation status of the diff group.
 */
export function useGetDiffGroupEvaluationStatus():
  | ((diffGroup: string | null) => EvaluationStatus | null)
  | null {
  const diffState = useBuildDiffState();
  const diffStateRef = useLiveRef(diffState);
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  return useMemo(() => {
    if (!getDiffEvaluationStatus) {
      return null;
    }
    return (diffGroup: string | null) => {
      if (!diffGroup) {
        return null;
      }
      const diffState = diffStateRef.current;
      const status = diffState.diffs.reduce(
        (groupStatus, diff) => {
          if (
            diff.group === diffGroup &&
            diff.status !== ScreenshotDiffStatus.Ignored
          ) {
            const diffStatus = getDiffEvaluationStatus(diff.id);
            if (groupStatus === undefined) {
              return diffStatus;
            }
            if (groupStatus !== diffStatus) {
              return null;
            }
          }
          return groupStatus;
        },
        undefined as EvaluationStatus | null | undefined,
      );
      return status ?? null;
    };
  }, [diffStateRef, getDiffEvaluationStatus]);
}

/**
 * Get the default diff evaluation status from the review event.
 */
function getDiffStatusAfterReview(
  event: BuildReviewEvent,
  diffStatus: EvaluationStatus | undefined,
): EvaluationStatus {
  diffStatus = diffStatus ?? EvaluationStatus.Pending;

  if (event === BuildReviewEvent.Approve) {
    if (diffStatus === EvaluationStatus.Pending) {
      return EvaluationStatus.Accepted;
    }
  }
  return diffStatus;
}

/**
 * Hook to get the diff statuses after a review.
 */
export function useGetReviewedDiffStatuses() {
  const api = use(BuildReviewAPIContext);
  const diffState = useBuildDiffState();
  return useEventCallback((event: BuildReviewEvent) => {
    invariant(api, "API context is not available");
    const diffStatuses = api.getDiffStatuses();
    return diffState.diffs.reduce<Record<Diff["id"], EvaluationStatus>>(
      (ids, diff) => {
        if (
          checkDiffCanBeReviewed(diff.status, {
            isSubsetBuild: diffState.isSubsetBuild,
          })
        ) {
          ids[diff.id] = getDiffStatusAfterReview(event, diffStatuses[diff.id]);
        }
        return ids;
      },
      {},
    );
  });
}

/**
 * State to get a diff evaluation status.
 */
export function useGetDiffStatus() {
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  return useCallback(
    (diffId: string | null) => {
      return getDiffEvaluationStatus
        ? diffId
          ? getDiffEvaluationStatus(diffId)
          : EvaluationStatus.Pending
        : null;
    },
    [getDiffEvaluationStatus],
  );
}

/**
 * State hook to manage the review status of one diff or diff group.
 */
export function useBuildDiffStatusState(args: {
  diffId: string | null;
  diffGroup: string | null;
}): [EvaluationStatus | null, (status: EvaluationStatus) => void] {
  const { diffId, diffGroup } = args;
  const diffState = useBuildDiffState();
  const api = use(BuildReviewAPIContext);

  /**
   * The diffs a status change targets: the whole group when the row stands for
   * a collapsed group, the diff itself otherwise. `null` means there is
   * nothing to write at all.
   */
  const getTargetDiffIds = useEventCallback((): string[] | null => {
    // An expanded group is reviewed diff by diff, so it falls back to the
    // single diff below.
    if (diffGroup && !diffState.expanded.includes(diffGroup)) {
      return diffState.diffs
        .filter(
          (diff) =>
            diff.group === diffGroup &&
            checkDiffCanBeReviewed(diff.status, {
              isSubsetBuild: diffState.isSubsetBuild,
            }),
        )
        .map((diff) => diff.id);
    }

    return diffId ? [diffId] : null;
  });

  const setDiffStatus = useEventCallback((status: EvaluationStatus) => {
    // A reference build carries no review state, so there is nothing to mark.
    if (!api) {
      return;
    }

    const diffIds = getTargetDiffIds();
    if (!diffIds) {
      return;
    }

    api.markDiffs(diffIds, status);
  });

  const getDiffStatus = useGetDiffStatus();
  return [getDiffStatus(diffId), setDiffStatus] as const;
}

/**
 * Local, not-yet-submitted evaluation statuses, persisted per build.
 *
 * The key must carry the account slug: project names are only unique within an
 * account, so two accounts owning a project of the same name would otherwise
 * share the storage of their same-numbered builds.
 */
const diffStatusesFamily = atomFamily(
  (params: { accountSlug: string; projectName: string; buildNumber: number }) =>
    atomWithStorage<Record<string, EvaluationStatus>>(
      `${params.accountSlug}/${params.projectName}#${params.buildNumber}.review.diffStatuses`,
      {},
    ),
);

/**
 * Provider to manage the review status of the build.
 */
export function BuildReviewStateProvider(props: {
  children: React.ReactNode;
  params: BuildParams;
  buildStatus: BuildStatus | null;
  buildType: BuildType | null;
}) {
  const { buildStatus, buildType, params } = props;
  const stableParams = useMemo(
    () => ({
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      buildNumber: params.buildNumber,
    }),
    [params.accountSlug, params.projectName, params.buildNumber],
  );
  const [diffStatuses, setDiffStatuses] = useAtom(
    diffStatusesFamily(stableParams),
  );
  const getDiffStatuses = useEventCallback(() => diffStatuses);
  const state = useMemo<BuildReviewStateValue | null>(() => {
    if (buildType === BuildType.Reference) {
      return null;
    }
    return { diffStatuses, buildStatus };
  }, [buildType, diffStatuses, buildStatus]);
  const { markDiffs, undo, redo, clearHistory } = useReviewMarkHistory({
    getDiffStatuses,
    setDiffStatuses,
    // Keyed by build, so walking back never reaches marks that belong to the
    // build the reviewer came from.
    buildKey: `${stableParams.accountSlug}/${stableParams.projectName}#${stableParams.buildNumber}`,
  });
  const api = useMemo<BuildReviewAPI | null>(() => {
    if (buildType === BuildType.Reference) {
      return null;
    }
    return {
      getDiffStatuses,
      setDiffStatuses,
      markDiffs,
      undo,
      redo,
      clearHistory,
    };
  }, [
    buildType,
    getDiffStatuses,
    setDiffStatuses,
    markDiffs,
    undo,
    redo,
    clearHistory,
  ]);
  return (
    <BuildReviewStateContext value={state}>
      <BuildReviewAPIContext value={api}>
        {props.children}
      </BuildReviewAPIContext>
    </BuildReviewStateContext>
  );
}

/**
 * Marking, and the two stacks that let the reviewer walk their markings back.
 *
 * Kept in memory only: the marks themselves outlive a reload (they are stored
 * per build), but a list of steps to walk back does not belong to a page the
 * reviewer has left.
 */
function useReviewMarkHistory(args: {
  getDiffStatuses: BuildReviewAPI["getDiffStatuses"];
  setDiffStatuses: BuildReviewAPI["setDiffStatuses"];
  buildKey: string;
}): Pick<BuildReviewAPI, "markDiffs" | "undo" | "redo" | "clearHistory"> {
  const { buildKey } = args;
  const argsRef = useLiveRef(args);
  // The stacks live in a ref rather than in state: nothing renders from them,
  // and pushing a step must not re-render the page the reviewer is working in.
  const stacksRef = useRef<ReviewMarkStacks>({
    buildKey,
    undo: [],
    redo: [],
  });
  // Read through here, never directly: the provider stays mounted when the
  // reviewer moves from one build to the next, and steps recorded on the build
  // they came from must not be walked back into the one they are on.
  const getStacks = useEventCallback((): ReviewMarkStacks => {
    if (stacksRef.current.buildKey !== buildKey) {
      stacksRef.current = { buildKey, undo: [], redo: [] };
    }
    return stacksRef.current;
  });

  const applyStatuses = useEventCallback(
    (statuses: Record<Diff["id"], EvaluationStatus>) => {
      argsRef.current.setDiffStatuses((diffStatuses) => ({
        ...diffStatuses,
        ...statuses,
      }));
    },
  );

  const markDiffs = useEventCallback(
    (diffIds: Diff["id"][], status: EvaluationStatus) => {
      const currentStatuses = argsRef.current.getDiffStatuses();
      const before: Record<Diff["id"], EvaluationStatus> = {};
      const after: Record<Diff["id"], EvaluationStatus> = {};
      for (const diffId of diffIds) {
        before[diffId] = currentStatuses[diffId] ?? EvaluationStatus.Pending;
        after[diffId] = status;
      }

      // Written even when `diffIds` is empty: a caller that planned an
      // acknowledgment waits on the statuses changing identity, and would hang
      // on a write that never happened.
      applyStatuses(after);

      const [firstDiffId] = diffIds;
      if (!firstDiffId) {
        return;
      }
      const stacks = getStacks();
      stacks.undo.push({ before, after, diffId: firstDiffId });
      if (stacks.undo.length > MAX_HISTORY_LENGTH) {
        stacks.undo.shift();
      }
      // A new marking forks the timeline: what was undone can no longer be
      // redone.
      stacks.redo.length = 0;
    },
  );

  const undo = useEventCallback((): AppliedReviewMarkChange | null => {
    const stacks = getStacks();
    const change = stacks.undo.pop();
    if (!change) {
      return null;
    }
    stacks.redo.push(change);
    applyStatuses(change.before);
    return {
      statuses: change.before,
      replaced: change.after,
      diffId: change.diffId,
    };
  });

  const redo = useEventCallback((): AppliedReviewMarkChange | null => {
    const stacks = getStacks();
    const change = stacks.redo.pop();
    if (!change) {
      return null;
    }
    stacks.undo.push(change);
    applyStatuses(change.after);
    return {
      statuses: change.after,
      replaced: change.before,
      diffId: change.diffId,
    };
  });

  const clearHistory = useEventCallback(() => {
    const stacks = getStacks();
    stacks.undo.length = 0;
    stacks.redo.length = 0;
  });

  return useMemo(
    () => ({ markDiffs, undo, redo, clearHistory }),
    [markDiffs, undo, redo, clearHistory],
  );
}
