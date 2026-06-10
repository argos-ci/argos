import { LightBulbIcon } from "@primer/octicons-react";

import { DocumentType, graphql } from "@/gql";
import { BuildMode } from "@/gql/graphql";
import { Details, Summary } from "@/ui/Details";

import {
  Emphasis,
  GuidanceStep,
  GuidanceStepTitle,
  SectionHeader,
} from "./shared";

const _BuildFragment = graphql(`
  fragment WhatToDoNow_Build on Build {
    mode
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

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
    <Details>
      <Summary chevronPosition="right">
        <SectionHeader noMargin>What to do now</SectionHeader>
      </Summary>
      <ol className="mt-3 flex flex-col gap-3 text-sm">
        <GuidanceStep index={1}>
          <GuidanceStepTitle>Review the changes</GuidanceStepTitle>
          Browse the screenshots and approve or reject each change.
        </GuidanceStep>
        <GuidanceStep index={2}>
          <GuidanceStepTitle>Submit a build review</GuidanceStepTitle>
          {isCi ? (
            hasRepository ? (
              <>
                This updates the <Emphasis>status check</Emphasis> so the pull
                request can be merged confidently.
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
