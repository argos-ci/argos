import { useMemo } from "react";
import { useParams } from "react-router-dom";

export interface BuildParams {
  ownerLogin: string;
  repositoryName: string;
  buildNumber: number;
  diffId: string | null;
}

export const useBuildParams = (): BuildParams | null => {
  const { ownerLogin, repositoryName, buildNumber, diffId } = useParams();
  const params = useMemo(() => {
    if (!ownerLogin || !repositoryName || !buildNumber) {
      return null;
    }
    const numBuildNumber = Number(buildNumber);
    const valid = Number.isInteger(numBuildNumber);
    if (!valid) return null;
    return {
      ownerLogin,
      repositoryName,
      buildNumber: numBuildNumber,
      diffId: diffId ?? null,
    };
  }, [ownerLogin, repositoryName, buildNumber, diffId]);
  return params;
};
