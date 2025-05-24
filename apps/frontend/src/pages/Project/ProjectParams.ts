import { useMemo } from "react";
import { useParams } from "react-router-dom";

export interface ProjectParams {
  accountSlug: string;
  projectName: string;
}

/**
 * Returns parameters for a project page.
 */
export function useProjectParams(): ProjectParams | null {
  const { accountSlug, projectName } = useParams();
  const params = useMemo(() => {
    if (!accountSlug || !projectName) {
      return null;
    }
    return {
      accountSlug,
      projectName,
    };
  }, [accountSlug, projectName]);
  return params;
}
