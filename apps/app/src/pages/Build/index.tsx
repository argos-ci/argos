import { memo } from "react";
import { Helmet } from "react-helmet";

import { BuildNotFound } from "./BuildNotFound";
import { BuildPage } from "./BuildPage";
import { useBuildParams } from "./BuildParams";

export const Build = memo(() => {
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
