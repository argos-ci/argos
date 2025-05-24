import { Helmet } from "react-helmet";

import { useVisitAccount } from "@/containers/AccountHistory";
import { BuildHotkeysDialog } from "@/containers/Build/BuildHotkeys";
import { BuildHotkeysDialogStateProvider } from "@/containers/Build/BuildHotkeysDialogState";

import { BuildNotFound } from "./BuildNotFound";
import { BuildPage } from "./BuildPage";
import { useBuildParams } from "./BuildParams";

/** @route */
export function Component() {
  const params = useBuildParams();
  useVisitAccount(params?.accountSlug ?? null);

  if (!params) {
    return <BuildNotFound />;
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
