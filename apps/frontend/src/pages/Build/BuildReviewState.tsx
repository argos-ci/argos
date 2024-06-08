import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { invariant } from "@argos/util/invariant";

import { useEventCallback } from "@/ui/useEventCallback";
import { usePrevious } from "@/ui/usePrevious";
import { useStorageState } from "@/util/useStorageState";

import {
  checkCanBeReviewed,
  Diff,
  useBuildDiffState,
  useGetNextDiff,
} from "./BuildDiffState";
import { BuildParams } from "./BuildParams";
import { useReviewDialog } from "./BuildReviewDialog";

export enum EvaluationStatus {
  Accepted = "accepted",
  Rejected = "rejected",
  Pending = "pending",
}

type BuildReviewStateValue = {
  diffStatuses: Record<Diff["id"], EvaluationStatus>;
  setDiffStatuses: React.Dispatch<
    React.SetStateAction<Record<Diff["id"], EvaluationStatus>>
  >;
};

const BuildReviewStateContext = createContext<BuildReviewStateValue | null>(
  null,
);

/**
 * Returns the current review state of the build.
 */
function useBuildReviewState() {
  const context = useContext(BuildReviewStateContext);
  invariant(
    context,
    "useBuildDiffVisibleState must be used within a BuildDiffVisibleStateProvider",
  );
  return context;
}

/**
 * Get the current review status of all diffs.
 * - "initializing": The review state is not yet initialized.
 * - "pending": Some diffs are not reviewed yet.
 * - "complete": All diffs are reviewed.
 */
function useReviewStatus() {
  const { stats } = useBuildDiffState();
  const { diffStatuses } = useBuildReviewState();
  return useMemo(() => {
    if (!stats) {
      return "initializing";
    }
    const expected = stats.added + stats.changed + stats.removed;
    const reviewed = Object.values(diffStatuses).filter(
      (status) => status !== EvaluationStatus.Pending,
    ).length;
    return expected === reviewed ? "complete" : "pending";
  }, [stats, diffStatuses]);
}

/**
 * Triggers the callback when the review becomes "complete".
 * Switching from "pending" to "complete" state.
 */
function useWatchReviewComplete(callback: () => void) {
  const reviewStatus = useReviewStatus();
  const previousReviewStatus = usePrevious(reviewStatus);
  const evtCallback = useEventCallback(callback);
  useEffect(() => {
    if (previousReviewStatus === "pending" && reviewStatus === "complete") {
      evtCallback();
    }
  }, [reviewStatus, previousReviewStatus, evtCallback]);
}

/**
 * Watch the review status and trigger the callback when the review is complete.
 */
export function ReviewCompleteWatcher(props: { onReviewComplete: () => void }) {
  useWatchReviewComplete(props.onReviewComplete);
  return null;
}

/**
 * Acknowledge the current diff and move to the next diff or show the review dialog.
 */
export function useAcknowledgeMarkedDiff() {
  const getNextDiff = useGetNextDiff();
  const reviewStatus = useReviewStatus();
  const { setActiveDiff } = useBuildDiffState();
  const reviewDialog = useReviewDialog();

  return useEventCallback(() => {
    const nextDiff = getNextDiff();
    if (reviewStatus === "complete") {
      reviewDialog.show();
    } else if (nextDiff && checkCanBeReviewed(nextDiff.status)) {
      setActiveDiff(nextDiff, true);
    }
  });
}

/**
 * Get the summary of the review status.
 * Diffs are grouped by their evaluation status.
 */
export function useBuildReviewSummary() {
  const { diffStatuses } = useBuildReviewState();
  const { diffs } = useBuildDiffState();
  return useMemo(() => {
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
export function useGetDiffEvaluationStatus() {
  const { diffStatuses } = useBuildReviewState();
  return useCallback(
    (diffId: string) => {
      return diffStatuses[diffId] ?? EvaluationStatus.Pending;
    },
    [diffStatuses],
  );
}

/**
 * Get the current evaluation status of the diff group.
 */
export function useBuildDiffGroupStatus(diffGroup: string | null) {
  const diffState = useBuildDiffState();
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  if (!diffGroup) {
    return null;
  }
  const status = diffState.diffs.reduce(
    (groupStatus, diff) => {
      if (diff.group === diffGroup) {
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
}

/**
 * Mark all diffs as accepted.
 */
export function useMarkAllDiffsAsAccepted() {
  const diffState = useBuildDiffState();
  const { setDiffStatuses } = useBuildReviewState();
  const markAllDiffsAsAccepted = useEventCallback(() => {
    setDiffStatuses((diffStatuses) => {
      const diffIds = diffState.diffs.reduce<string[]>((ids, diff) => {
        if (checkCanBeReviewed(diff.status)) {
          ids.push(diff.id);
        }
        return ids;
      }, []);

      if (
        diffIds.some(
          (diffId) => diffStatuses[diffId] === EvaluationStatus.Rejected,
        )
      ) {
        return diffStatuses;
      }

      return diffIds.reduce<Record<string, EvaluationStatus>>(
        (statuses, diffId) => {
          statuses[diffId] = EvaluationStatus.Accepted;
          return statuses;
        },
        {},
      );
    });
  });
  return markAllDiffsAsAccepted;
}

/**
 * State hook to manage the review status of one diff or diff group.
 */
export function useBuildDiffStatusState(args: {
  diffId: string | null;
  diffGroup: string | null;
}) {
  const { diffId, diffGroup } = args;
  const diffState = useBuildDiffState();
  const { setDiffStatuses } = useBuildReviewState();
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  const setGroupStatus = useEventCallback((status: EvaluationStatus) => {
    if (!diffGroup) {
      return false;
    }

    // If the group is expanded, we don't want to set the status of the group
    if (diffState.expanded.includes(diffGroup)) {
      return false;
    }

    const diffIds = diffState.diffs
      .filter((diff) => diff.group === diffGroup)
      .map((diff) => diff.id);

    setDiffStatuses((diffStatuses) => {
      const nextValue = { ...diffStatuses };
      diffIds.forEach((diffId) => {
        nextValue[diffId] = status;
      });
      return nextValue;
    });
    return true;
  });
  const setDiffStatus = useEventCallback((status: EvaluationStatus) => {
    if (setGroupStatus(status)) {
      return;
    }

    if (diffId) {
      setDiffStatuses((diffStatuses) => {
        const nextValue = {
          ...diffStatuses,
          [diffId]: status,
        };
        return nextValue;
      });
    }
  });
  return [
    diffId ? getDiffEvaluationStatus(diffId) : EvaluationStatus.Pending,
    setDiffStatus,
  ] as const;
}

/**
 * Provider to manage the review status of the build.
 */
export function BuildReviewStateProvider(props: {
  children: React.ReactNode;
  params: BuildParams;
}) {
  const storageKey = `${props.params.projectName}#${props.params.buildNumber}.review.diffStatuses`;
  const [diffStatuses, setDiffStatuses] = useStorageState<
    Record<string, EvaluationStatus>
  >(storageKey, {});
  const value = useMemo<BuildReviewStateValue>(
    () => ({ diffStatuses, setDiffStatuses }),
    [diffStatuses, setDiffStatuses],
  );
  return (
    <BuildReviewStateContext.Provider value={value}>
      {props.children}
    </BuildReviewStateContext.Provider>
  );
}
