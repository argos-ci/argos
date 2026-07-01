import { Helmet } from "react-helmet";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { useVisitAccount } from "@/containers/AccountHistory";
import { BuildHotkeysDialog } from "@/containers/Build/BuildHotkeys";
import { BuildHotkeysDialogStateProvider } from "@/containers/Build/BuildHotkeysDialogState";

import { BuildNotFound } from "./BuildNotFound";
import { BuildPage } from "./BuildPage";
import { getBuildOverviewURL, useBuildParams } from "./BuildParams";

export function Component() {
  const params = useBuildParams();
  const { diffId: rawDiffId } = useParams();
  const { hash } = useLocation();
  useVisitAccount(params?.accountSlug ?? null);

  if (!params) {
    return <BuildNotFound />;
  }

  // Canonical URL for the overview is /builds/:buildNumber/overview. Preserve
  // the hash so comment deep-links (e.g. `#comment-xxx` from notifications,
  // which point at the build root) still scroll to their target.
  if (!rawDiffId) {
    return (
      <Navigate to={{ pathname: getBuildOverviewURL(params), hash }} replace />
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Build ${params.buildNumber} • ${params.projectName}`}</title>
      </Helmet>
      <BuildHotkeysDialogStateProvider>
        <BuildPage params={params} />
        <BuildHotkeysDialog env="build" />
      </BuildHotkeysDialogStateProvider>
    </>
  );
}
