import { createContext, use, useEffect, useMemo, useRef } from "react";
import { invariant } from "@argos/util/invariant";
import { atomFamily } from "jotai-family";
import { useAtom } from "jotai/react";
import { atomWithStorage } from "jotai/utils";

import { BuildStatus, BuildType, ReviewState } from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";
import { useLiveRef } from "@/ui/useLiveRef";
import { usePrevious } from "@/ui/usePrevious";

import {
  checkDiffCanBeReviewed,
  Diff,
  useBuildDiffState,
  useGetNextDiff,
  type UseGetNextDiffOptions,
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

type BuildReviewAPI = {
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
   * The map of listeners for diff status changes.
   */
  listenersRef: React.RefObject<Listener[]>;
};

const BuildReviewAPIContext = createContext<BuildReviewAPI | null>(null);

/**
 * Get the current review status of all diffs.
 * - "initializing": The review state is not yet initialized.
 * - "pending": Some diffs are not reviewed yet.
 * - "complete": All diffs are reviewed.
 */
function useReviewStatus(): "initializing" | "pending" | "complete" | null {
  const { stats } = useBuildDiffState();
  const state = use(BuildReviewStateContext);
  const diffStatuses = state?.diffStatuses ?? null;
  return useMemo(() => {
    if (!diffStatuses) {
      return null;
    }

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
 * Watch the review status of the diffs.
 */
export function useWatchItemReview():
  | ((callback: Listener) => () => void)
  | null {
  const api = use(BuildReviewAPIContext);
  const listenersRef = api?.listenersRef;
  return useMemo(() => {
    if (!listenersRef) {
      return null;
    }
    return (callback: Listener) => {
      const listener: Listener = (value) => callback(value);
      listenersRef.current.push(listener);
      return () => {
        listenersRef.current = listenersRef.current.filter(
          (v) => v !== listener,
        );
      };
    };
  }, [listenersRef]);
}

export function useBuildReviewAPI(): BuildReviewAPI | null {
  return use(BuildReviewAPIContext);
}

/**
 * Acknowledge the current diff and move to the next diff or show the review dialog.
 */
export function useAcknowledgeMarkedDiff(options?: UseGetNextDiffOptions) {
  const getDiffStatus = useGetDiffEvaluationStatus();
  const getNextDiff = useGetNextDiff((diff) => {
    if (!getDiffStatus) {
      return false;
    }
    return getDiffStatus(diff.id) === EvaluationStatus.Pending;
  }, options);
  const reviewStatus = useReviewStatus();
  const { setActiveDiff } = useBuildDiffState();
  const reviewDialog = useReviewDialog();
  const state = use(BuildReviewStateContext);
  const diffStatuses = state?.diffStatuses ?? null;
  const diffStatusesRef = useRef<Record<string, EvaluationStatus> | null>(null);

  const acknowledge = useEventCallback(() => {
    const nextDiff = getNextDiff();
    if (reviewStatus === "complete") {
      reviewDialog.show();
    } else if (nextDiff && checkDiffCanBeReviewed(nextDiff.status)) {
      setActiveDiff(nextDiff, true);
    }
  });

  useEffect(() => {
    if (diffStatusesRef.current && diffStatuses !== diffStatusesRef.current) {
      diffStatusesRef.current = null;
      acknowledge();
    }
  }, [diffStatuses, acknowledge]);

  const planAck = useEventCallback(() => {
    diffStatusesRef.current = diffStatuses;
  });

  const checkIsPending = useEventCallback(() => {
    return Boolean(diffStatusesRef.current);
  });

  return [checkIsPending, planAck] as const;
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
    };
  }, [diffStateRef, getDiffEvaluationStatus]);
}

/**
 * Get the default diff evaluation status from the review state.
 */
function getDiffStatusAfterReview(
  reviewState: ReviewState,
  diffStatus: EvaluationStatus | undefined,
): EvaluationStatus {
  diffStatus = diffStatus ?? EvaluationStatus.Pending;

  if (reviewState === ReviewState.Approved) {
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
  return useEventCallback((reviewState: ReviewState) => {
    invariant(api, "API context is not available");
    const diffStatuses = api.getDiffStatuses();
    return diffState.diffs.reduce<Record<Diff["id"], EvaluationStatus>>(
      (ids, diff) => {
        if (checkDiffCanBeReviewed(diff.status)) {
          ids[diff.id] = getDiffStatusAfterReview(
            reviewState,
            diffStatuses[diff.id],
          );
        }
        return ids;
      },
      {},
    );
  });
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
  const setDiffStatuses = api?.setDiffStatuses;
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  const setGroupStatus = useEventCallback((status: EvaluationStatus) => {
    if (!diffGroup || !setDiffStatuses) {
      return false;
    }

    // If the group is expanded, we don't want to set the status of the group
    if (diffState.expanded.includes(diffGroup)) {
      return false;
    }

    const diffIds = diffState.diffs
      .filter(
        (diff) =>
          diff.group === diffGroup && checkDiffCanBeReviewed(diff.status),
      )
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
    if (!setDiffStatuses) {
      return;
    }

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
    getDiffEvaluationStatus
      ? diffId
        ? getDiffEvaluationStatus(diffId)
        : EvaluationStatus.Pending
      : null,
    setDiffStatus,
  ] as const;
}

const diffStatusesFamily = atomFamily((params: BuildParams) =>
  atomWithStorage<Record<string, EvaluationStatus>>(
    `${params.projectName}#${params.buildNumber}.review.diffStatuses`,
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
  const { buildStatus, buildType } = props;
  const [diffStatuses, setDiffStatuses] = useAtom(
    diffStatusesFamily(props.params),
  );
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
  const getDiffStatuses = useEventCallback(() => diffStatuses);
  const state = useMemo<BuildReviewStateValue | null>(() => {
    if (buildType === BuildType.Reference) {
      return null;
    }
    return { diffStatuses, buildStatus };
  }, [buildType, diffStatuses, buildStatus]);
  const api = useMemo<BuildReviewAPI | null>(() => {
    if (buildType === BuildType.Reference) {
      return null;
    }
    return { getDiffStatuses, setDiffStatuses, listenersRef };
  }, [buildType, getDiffStatuses, setDiffStatuses, listenersRef]);
  return (
    <BuildReviewStateContext value={state}>
      <BuildReviewAPIContext value={api}>
        {props.children}
      </BuildReviewAPIContext>
    </BuildReviewStateContext>
  );
}
