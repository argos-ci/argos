import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { invariant } from "@argos/util/invariant";

import { BuildStatus } from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";
import { useLiveRef } from "@/ui/useLiveRef";
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

type Listener = (value: { id: Diff["id"]; status: EvaluationStatus }) => void;

type BuildReviewStateValue = {
  diffStatuses: Record<Diff["id"], EvaluationStatus>;
  setDiffStatuses: React.Dispatch<
    React.SetStateAction<Record<Diff["id"], EvaluationStatus>>
  >;
  buildStatus: BuildStatus | null;
  listenersRef: React.RefObject<Listener[]>;
};

const BuildReviewStateContext = createContext<BuildReviewStateValue | null>(
  null,
);

/**
 * Returns the current review state of the build.
 */
function useBuildReviewState() {
  const context = use(BuildReviewStateContext);
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

export function useWatchItemReview() {
  const { listenersRef } = useBuildReviewState();
  return useCallback(
    (callback: Listener) => {
      const listener: Listener = (value) => callback(value);
      listenersRef.current.push(listener);
      return () => {
        listenersRef.current = listenersRef.current.filter(
          (v) => v !== listener,
        );
      };
    },
    [listenersRef],
  );
}

/**
 * Acknowledge the current diff and move to the next diff or show the review dialog.
 */
export function useAcknowledgeMarkedDiff() {
  const getDiffStatus = useGetDiffEvaluationStatus();
  const getNextDiff = useGetNextDiff((diff) => {
    return getDiffStatus(diff.id) === EvaluationStatus.Pending;
  });
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
export function useGetDiffGroupEvaluationStatus() {
  const diffState = useBuildDiffState();
  const diffStateRef = useLiveRef(diffState);
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  return useCallback(
    (diffGroup: string | null) => {
      if (!diffGroup) {
        return null;
      }
      const diffState = diffStateRef.current;
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
    },
    [diffStateRef, getDiffEvaluationStatus],
  );
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
  buildStatus: BuildStatus | null;
}) {
  const { buildStatus } = props;
  const storageKey = `${props.params.projectName}#${props.params.buildNumber}.review.diffStatuses`;
  const [diffStatuses, setDiffStatuses] = useStorageState<
    Record<string, EvaluationStatus>
  >(storageKey, {});
  const listenersRef = useRef<Listener[]>([]);
  const previousDiffStatuses = usePrevious(diffStatuses);
  useEffect(() => {
    if (!previousDiffStatuses || diffStatuses === previousDiffStatuses) {
      return;
    }
    for (const [id, status] of Object.entries(diffStatuses)) {
      const previousStatus = previousDiffStatuses[id];
      if (status !== previousStatus) {
        listenersRef.current.forEach((callback) => {
          callback({ id, status });
        });
      }
    }
  }, [diffStatuses, previousDiffStatuses]);
  const value = useMemo<BuildReviewStateValue>(
    () => ({ diffStatuses, setDiffStatuses, buildStatus, listenersRef }),
    [diffStatuses, setDiffStatuses, buildStatus, listenersRef],
  );
  return (
    <BuildReviewStateContext value={value}>
      {props.children}
    </BuildReviewStateContext>
  );
}
