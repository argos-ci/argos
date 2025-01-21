import { useMemo } from "react";
import { useParams } from "react-router-dom";

export interface BuildParams {
  accountSlug: string;
  projectName: string;
  buildNumber: number;
  diffId: string | null;
}

export const useBuildParams = (): BuildParams | null => {
  const { accountSlug, projectName, buildNumber, diffId } = useParams();
  const params = useMemo(() => {
    if (!accountSlug || !projectName || !buildNumber) {
      return null;
    }
    const numBuildNumber = Number(buildNumber);
    const valid =
      // Integer.
      Number.isInteger(numBuildNumber) &&
      // Positive.
      numBuildNumber > 0 &&
      // Signed 32-bit.
      numBuildNumber < 2147483647;
    if (!valid) {
      return null;
    }
    return {
      accountSlug,
      projectName,
      buildNumber: numBuildNumber,
      diffId: diffId ?? null,
    };
  }, [accountSlug, projectName, buildNumber, diffId]);
  return params;
};
