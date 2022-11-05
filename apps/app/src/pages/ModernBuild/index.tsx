import { memo } from "react";
import { Helmet } from "react-helmet";

import { BuildPage } from "./BuildPage";
import { useBuildParams } from "./BuildParams";
import { BuildNotFound } from "./BuildNotFound";

export const ModernBuild = memo(() => {
  const params = useBuildParams();

  if (!params) {
    return <BuildNotFound />;
  }

  return (
    <>
      <Helmet>
        <title>{`Build ${params.buildNumber} • ${params.repositoryName}`}</title>
      </Helmet>
      <BuildPage params={params} />
    </>
  );
});
