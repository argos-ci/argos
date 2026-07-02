import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";

import { useGoToNextDiff } from "../BuildDiffState";
import { ReviewActivitySection } from "../sidebar/ReviewActivitySection";
import { ReviewersSection } from "../sidebar/ReviewersSection";
import { BuildSummary } from "./BuildSummary";
import { ContextSection } from "./ContextSection";
import { DeploymentSection } from "./DeploymentSection";
import { ImpactAnalysisSection } from "./ImpactAnalysisSection";

const _BuildFragment = graphql(`
  fragment BuildOverview_Build on Build {
    id
    storybook
    deployment {
      id
    }
    ...BuildSummary_Build
    ...ImpactAnalysisSection_Build
    ...ContextSection_Build
    ...DeploymentSection_Build
    ...ReviewersSection_Build
    ...ReviewActivitySection_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

export function BuildOverview(props: { build: Build; repoUrl: string | null }) {
  const { build, repoUrl } = props;
  const goToFirstDiff = useGoToNextDiff();
  useBuildHotkey("goToNextDiff", goToFirstDiff);
  useBuildHotkey("acceptDiff", goToFirstDiff);
  useBuildHotkey("rejectDiff", goToFirstDiff);
  useBuildHotkey("startReview", goToFirstDiff, {
    ignoreInteractiveTarget: true,
  });

  const showDeployment = Boolean(build.deployment) || build.storybook;
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-10 p-6 lg:flex-row lg:gap-8">
        <div className="flex min-w-0 flex-1 justify-center">
          <main className="flex w-full max-w-3xl flex-col gap-10">
            <BuildSummary build={build} />
            <ImpactAnalysisSection build={build} repoUrl={repoUrl} />
          </main>
        </div>
        <aside className="flex shrink-0 flex-col gap-4 lg:w-96">
          <ContextSection build={build} repoUrl={repoUrl} />
          {showDeployment ? <DeploymentSection build={build} /> : null}
          <ReviewersSection build={build} />
          <ReviewActivitySection build={build} />
        </aside>
      </div>
    </div>
  );
}
