import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { useProjectParams, type ProjectParams } from "../Project/ProjectParams";

export interface TestParams extends ProjectParams {
  testId: string;
}

export function useTestParams(): TestParams | null {
  const { testId } = useParams();
  const projectParams = useProjectParams();
  const params = useMemo(() => {
    if (!projectParams || !testId) {
      return null;
    }

    return {
      ...projectParams,
      testId,
    };
  }, [projectParams, testId]);
  return params;
}
