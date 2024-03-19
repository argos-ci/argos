import { createContext, useCallback, useContext, useMemo } from "react";
import { invariant } from "@argos/util/invariant";

import { useEventCallback } from "@/ui/useEventCallback";
import { useStorageState } from "@/util/useStorageState";

import { useBuildDiffState } from "./BuildDiffState";
import { BuildParams } from "./BuildParams";

export enum EvaluationStatus {
  Accepted = "accepted",
  Rejected = "rejected",
  Pending = "pending",
}

type BuildReviewStateValue = {
  diffStatuses: Record<string, EvaluationStatus>;
  setDiffStatuses: React.Dispatch<
    React.SetStateAction<Record<string, EvaluationStatus>>
  >;
};

const BuildReviewStateContext = createContext<BuildReviewStateValue | null>(
  null,
);

function useBuildReviewState() {
  const context = useContext(BuildReviewStateContext);
  invariant(
    context,
    "useBuildDiffVisibleState must be used within a BuildDiffVisibleStateProvider",
  );
  return context;
}

export function useGetDiffEvaluationStatus() {
  const { diffStatuses } = useBuildReviewState();
  return useCallback(
    (diffId: string) => {
      return diffStatuses[diffId] ?? EvaluationStatus.Pending;
    },
    [diffStatuses],
  );
}

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
