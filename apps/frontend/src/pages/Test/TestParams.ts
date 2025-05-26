import { useMemo } from "react";
import { useParams } from "react-router-dom";

import {
  getProjectURL,
  useProjectParams,
  type ProjectParams,
} from "../Project/ProjectParams";

interface TestParams extends ProjectParams {
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

export interface TestSearchParams {
  period?: string | null;
  change?: string | null;
}

export function getTestURL(
  params: TestParams,
  searchParams?: TestSearchParams,
): string {
  const urlSearchParams = searchParams
    ? new URLSearchParams(Object.entries(searchParams)).toString()
    : null;
  return `${getProjectURL(params)}/tests/${params.testId}${urlSearchParams ? `?${urlSearchParams}` : ""}`;
}
