import { useMemo } from "react";
import { useParams } from "react-router-dom";

import {
  getAccountURL,
  useAccountParams,
  type AccountParams,
} from "../Account/AccountParams";

export interface ProjectParams extends AccountParams {
  projectName: string;
}

/**
 * Returns parameters for a project page.
 */
export function useProjectParams(): ProjectParams | null {
  const { projectName } = useParams();
  const accountParams = useAccountParams();
  const params = useMemo(() => {
    if (!accountParams || !projectName) {
      return null;
    }
    return {
      ...accountParams,
      projectName,
    };
  }, [accountParams, projectName]);
  return params;
}

export function getProjectURL(params: ProjectParams): string {
  return `${getAccountURL(params)}/${params.projectName}`;
}
