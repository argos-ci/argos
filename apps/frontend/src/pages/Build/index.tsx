import { Helmet } from "react-helmet";

import { useVisitAccount } from "@/containers/AccountHistory";

import { BuildHotkeysDialogStateProvider } from "./BuildHotkeysDialogState";
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
      </BuildHotkeysDialogStateProvider>
    </>
  );
}
