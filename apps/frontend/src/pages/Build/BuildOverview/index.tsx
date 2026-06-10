import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";

import { useGoToNextDiff } from "../BuildDiffState";
import { ReviewActivitySection } from "../sidebar/ReviewActivitySection";
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
    ...ReviewActivitySection_Build
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

const Aside = ({ children }: { children: React.ReactNode }) => (
  <aside className="lg:border-l-thin flex shrink-0 flex-col lg:w-96 lg:pl-8">
    {children}
  </aside>
);

const AsideSection = ({ children }: { children: React.ReactNode }) => (
  <div className="border-t-thin mt-8 pt-8">{children}</div>
);

export function BuildOverview(props: { build: Build; hasRepository: boolean }) {
  const { build, hasRepository } = props;
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 p-6 lg:flex-row lg:gap-8">
        <main className="flex flex-1 flex-col gap-10 overflow-hidden">
          <BuildSummary build={build} hasRepository={hasRepository} />
          <ImpactAnalysisSection build={build} />
        </main>
        <Aside>
          <ContextSection build={build} />
          {showDeployment ? (
            <AsideSection>
              <DeploymentSection build={build} />
            </AsideSection>
          ) : null}
          <AsideSection>
            <ReviewActivitySection build={build} variant="page" />
          </AsideSection>
        </Aside>
      </div>
    </div>
  );
}
