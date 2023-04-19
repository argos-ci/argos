import { useMemo } from "react";
import { useParams } from "react-router-dom";

export interface BuildParams {
  accountSlug: string;
  projectSlug: string;
  buildNumber: number;
  diffId: string | null;
}

export const useBuildParams = (): BuildParams | null => {
  const { accountSlug, projectSlug, buildNumber, diffId } = useParams();
  const params = useMemo(() => {
    if (!accountSlug || !projectSlug || !buildNumber) {
      return null;
    }
    const numBuildNumber = Number(buildNumber);
    const valid = Number.isInteger(numBuildNumber);
    if (!valid) return null;
    return {
      accountSlug,
      projectSlug,
      buildNumber: numBuildNumber,
      diffId: diffId ?? null,
    };
  }, [accountSlug, projectSlug, buildNumber, diffId]);
  return params;
};
