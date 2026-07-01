import React from "react";
import { GitBranch } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildStatus, BuildType } from "@/gql/graphql";

import { Code } from "../../../ui/Code";
import { useBuildDiffState } from "../BuildDiffState";
import { Emphasis } from "./shared";

const _BuildFragment = graphql(`
  fragment BuildSummaryDescription_Build on Build {
    type
    status
    mode
    branch
    baseBranch
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

function Paragraph(props: { children: React.ReactNode }) {
  return <div className="mt-2 text-balance">{props.children}</div>;
}

/** A branch name rendered as a chip, or a plain-text fallback when unknown. */
function BranchTag(props: { name: string | null; fallback: string }) {
  return props.name ? (
    <Code className="whitespace-nowrap">
      <GitBranch className="mr-1 inline h-4 w-4" />
      {props.name}
    </Code>
  ) : (
    <>{props.fallback}</>
  );
}

function ChangesResume() {
  return (
    <Paragraph>
      <Emphasis>Visual changes were detected in this build.</Emphasis> Please
      review the screenshots and confirm whether these changes are expected.
    </Paragraph>
  );
}

export function BuildSummaryDescription({ build }: { build: Build }) {
  const { stats } = useBuildDiffState();
  const hasFailures = stats && Boolean(stats.failure);

  if (build.type === BuildType.Orphan) {
    return (
      <>
        <Paragraph>Argos has nothing to compare this build against.</Paragraph>
        <Paragraph>
          This is expected for a project's first builds. Otherwise, it usually
          means{" "}
          <BranchTag name={build.baseBranch} fallback="your base branch" />{" "}
          doesn't have an Argos build yet that this branch can compare against.
        </Paragraph>
      </>
    );
  }

  if (hasFailures) {
    return (
      <>
        <Paragraph>
          <Emphasis className="text-danger-low">
            {stats.failure} test{stats.failure > 1 ? "s" : ""} failed in this
            build.
          </Emphasis>{" "}
          Its screenshots may be incomplete or show a broken state, so reviewing
          the changes won't be meaningful.
        </Paragraph>
        <Paragraph>
          Fix the failing tests and re-run to get a build worth comparing.
        </Paragraph>
      </>
    );
  }

  if (build.type === BuildType.Reference) {
    return (
      <Paragraph>
        This build ran on{" "}
        <BranchTag name={build.branch} fallback="your base branch" />, so it now
        serves as the baseline that future builds are compared against.
      </Paragraph>
    );
  }

  switch (build.status) {
    case BuildStatus.ChangesDetected:
      return <ChangesResume />;

    case BuildStatus.Accepted:
      return build.mode === BuildMode.Monitoring ? (
        <Paragraph>
          The visual changes were approved. This build is now the baseline for
          future comparisons.
        </Paragraph>
      ) : (
        <Paragraph>
          The visual changes were approved — the status check now passes. This
          build will become the baseline once its pull request is merged.
        </Paragraph>
      );

    case BuildStatus.Rejected:
      return (
        <Paragraph>The visual changes in this build were rejected.</Paragraph>
      );

    case BuildStatus.NoChanges:
      return <Paragraph>All screenshots match the baseline.</Paragraph>;

    default:
      return null;
  }
}
