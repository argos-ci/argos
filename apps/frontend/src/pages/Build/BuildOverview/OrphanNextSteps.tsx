import { LightBulbIcon } from "@primer/octicons-react";

import { DocumentType, graphql } from "@/gql";
import { BuildMode } from "@/gql/graphql";
import { Link } from "@/ui/Link";

import { getProjectURL } from "../../Project/ProjectParams";
import { useBuildParams } from "../BuildParams";
import { Emphasis } from "./shared";

const _BuildFragment = graphql(`
  fragment OrphanNextSteps_Build on Build {
    mode
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

function GuidanceStep(props: { index: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="bg-info-ui text-info-low flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
        {props.index}
      </span>
      <span className="text-low min-w-0 flex-1 text-balance">
        {props.children}
      </span>
    </li>
  );
}

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
        <h3 className="text-default mb-3 text-sm font-semibold">Next step</h3>
        <p className="text-low text-sm text-balance">
          Approve this build to use it as the <Emphasis>baseline</Emphasis> for
          future comparisons.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h3 className="text-default mb-3 text-sm font-semibold">Next steps</h3>
      <ol className="flex flex-col gap-3 text-sm">
        <GuidanceStep index={1}>
          <Emphasis>Build your comparison baseline.</Emphasis> Run Argos in CI
          on your baseline branch so it records a baseline.
        </GuidanceStep>
        <GuidanceStep index={2}>
          <Emphasis>Open a pull request.</Emphasis> Following builds will
          automatically compare against that baseline.
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

/**
 * Guidance walking a reviewer through what's expected of them on a build with a
 * baseline. Helpful for first-timers, noise for everyone else — so it's
 * collapsed by default and opened on demand.
 *
 * The wording adapts to whether a git repository is connected: only then is
 * there a status check to update or a pull request to merge.
 */
export function WhatToDoNow(props: { build: Build; hasRepository: boolean }) {
  const { build, hasRepository } = props;
  // In CI, approving doesn't set the baseline — that only happens once the
  // branch is merged and Argos re-runs on the base branch.
  const isCi = build.mode === BuildMode.Ci;

  return (
    <Details className="max-w-xl">
      <Summary>
        <SectionHeader noMargin>What to do now</SectionHeader>
      </Summary>
      <ol className="flex flex-col gap-3 text-sm">
        <GuidanceStep index={1}>
          <GuidanceStepTitle>Review the changes</GuidanceStepTitle>
          Browse the screenshots and approve or reject each change.
        </GuidanceStep>
        <GuidanceStep index={2}>
          <GuidanceStepTitle>Approve the build</GuidanceStepTitle>
          {isCi ? (
            hasRepository ? (
              <>
                This updates the <Emphasis>status check</Emphasis> so the pull
                request can be merged.
              </>
            ) : (
              <>This confirms the changes are expected.</>
            )
          ) : hasRepository ? (
            <>
              It becomes the <Emphasis>baseline</Emphasis> for future
              comparisons and updates the status check.
            </>
          ) : (
            <>
              It becomes the <Emphasis>baseline</Emphasis> for future
              comparisons.
            </>
          )}
        </GuidanceStep>
      </ol>
      {isCi ? (
        <p className="text-low mt-4 text-sm">
          <LightBulbIcon className="text-low mr-2 inline-block size-4" />
          This build only becomes the baseline once the branch is merged and
          Argos runs on your base branch.
        </p>
      ) : null}
    </Details>
  );
}
