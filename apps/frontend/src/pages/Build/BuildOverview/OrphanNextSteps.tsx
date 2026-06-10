import { LightBulbIcon } from "@primer/octicons-react";

import { DocumentType, graphql } from "@/gql";
import { BuildMode } from "@/gql/graphql";
import { Link } from "@/ui/Link";

import { getProjectURL } from "../../Project/ProjectParams";
import { useBuildParams } from "../BuildParams";
import {
  Emphasis,
  GuidanceStep,
  GuidanceStepTitle,
  SectionHeader,
} from "./shared";

const _BuildFragment = graphql(`
  fragment OrphanNextSteps_Build on Build {
    mode
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

/**
 * Onboarding guidance shown in the briefing of an orphan build — a build with
 * no baseline to compare against (typically a project's first builds), since
 * setting up a baseline is the main expected action. Replaces the former modal.
 */
export function OrphanNextSteps(props: { build: Build }) {
  const { build } = props;
  const params = useBuildParams();
  if (build.mode === BuildMode.Monitoring) {
    return (
      <div className="max-w-xl">
        <SectionHeader>Next step</SectionHeader>
        <p className="text-low text-sm text-balance">
          Approve this build to use it as the <Emphasis>baseline</Emphasis> for
          future comparisons.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <SectionHeader>Next steps</SectionHeader>
      <ol className="flex flex-col gap-3 text-sm">
        <GuidanceStep index={1}>
          <GuidanceStepTitle>Build your comparison baseline</GuidanceStepTitle>
          Run Argos in CI on your baseline branch so it records a baseline.
        </GuidanceStep>
        <GuidanceStep index={2}>
          <GuidanceStepTitle>Open a pull request</GuidanceStepTitle>Start a new
          branch or rebase your current branch onto the baseline branch. New
          builds will automatically compare against that baseline.
        </GuidanceStep>
      </ol>
      <p className="text-low mt-4 text-sm">
        {params ? (
          <>
            <LightBulbIcon className="text-low mr-2 inline-block size-4" />
            You can configure baseline branch in the{" "}
            <Link href={`${getProjectURL(params)}/settings/baseline-builds`}>
              project settings
            </Link>
            .
          </>
        ) : null}
      </p>
    </div>
  );
}
