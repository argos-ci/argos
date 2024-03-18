import { createContext, useCallback, useContext, useMemo } from "react";
import { invariant } from "@argos/util/invariant";

import { useStorageState } from "@/util/useStorageState";

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

export function useBuildReviewState() {
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

export function useBuildDiffStatusState(diffId: string | null) {
  const { setDiffStatuses } = useBuildReviewState();
  const getDiffEvaluationStatus = useGetDiffEvaluationStatus();
  const setDiffStatus = useCallback(
    (status: EvaluationStatus) => {
      if (diffId) {
        setDiffStatuses((diffStatuses) => {
          const nextValue = {
            ...diffStatuses,
            [diffId]: status,
          };
          return nextValue;
        });
      }
    },
    [diffId, setDiffStatuses],
  );
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
