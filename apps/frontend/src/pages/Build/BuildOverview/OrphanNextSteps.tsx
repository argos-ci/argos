import { LightBulbIcon } from "@primer/octicons-react";

import { DocumentType, graphql } from "@/gql";
import { BuildMode } from "@/gql/graphql";
import { Link } from "@/ui/Link";

import { getProjectURL } from "../../Project/ProjectParams";
import { useBuildParams } from "../BuildParams";
import {
  BranchTag,
  Emphasis,
  GuidanceStep,
  GuidanceStepTitle,
  SectionHeader,
} from "./shared";

const _BuildFragment = graphql(`
  fragment OrphanNextSteps_Build on Build {
    mode
    baseBranch
    pullRequest {
      id
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

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
          <GuidanceStepTitle>Record a baseline</GuidanceStepTitle>
          Run Argos in CI on{" "}
          <BranchTag name={build.baseBranch} fallback="your base branch" />
          {build.pullRequest ? " — usually by merging this pull request" : ""}.
          Its first build there is approved automatically and becomes the{" "}
          <Link
            href="https://argos-ci.com/docs/learn/platform-fundamentals/baseline-build"
            external
          >
            baseline
          </Link>
          .
        </GuidanceStep>
        <GuidanceStep index={2}>
          <GuidanceStepTitle>Compare on future builds</GuidanceStepTitle> Once{" "}
          <BranchTag name={build.baseBranch} fallback="your base branch" /> has
          a build, your following builds compare against it automatically and
          surface visual changes.
        </GuidanceStep>
      </ol>
      {params ? (
        <p className="text-low mt-4 text-sm">
          <LightBulbIcon className="text-low mr-2 inline-block size-4" />
          You can configure the base branch in the{" "}
          <Link href={`${getProjectURL(params)}/settings/baseline-builds`}>
            project settings
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
