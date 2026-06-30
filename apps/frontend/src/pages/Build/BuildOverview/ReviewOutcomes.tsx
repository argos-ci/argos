import { CheckIcon, XIcon } from "@primer/octicons-react";

import { DocumentType, graphql } from "@/gql";
import { BuildMode } from "@/gql/graphql";

import { Emphasis } from "./shared";

const _BuildFragment = graphql(`
  fragment ReviewOutcomes_Build on Build {
    mode
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

type OutcomeContext = {
  isCi: boolean;
  hasRepository: boolean;
  hasPullRequest: boolean;
};

/**
 * What approving or rejecting this build will actually do. The consequence
 * differs by mode — in monitoring, approving moves the baseline; in CI, it
 * gates the pull request / status check and the baseline only moves once the
 * branch is merged. We also adapt to whether there's a repository and a pull
 * request at all, since neither is guaranteed.
 */
function getReviewOutcomes(ctx: OutcomeContext): {
  approve: React.ReactNode;
  reject: React.ReactNode;
} {
  const { isCi, hasRepository, hasPullRequest } = ctx;

  // Monitoring: no pull request, no merge. Approving is the only thing that
  // advances the baseline.
  if (!isCi) {
    return {
      approve: (
        <>
          This build becomes the new <Emphasis>baseline</Emphasis> for future
          comparisons.
        </>
      ),
      reject: (
        <>The current baseline is kept — future builds compare against it.</>
      ),
    };
  }

  // CI with an open pull request: the status check is what unblocks the merge.
  if (hasPullRequest) {
    return {
      approve: (
        <>
          The <Emphasis>status check</Emphasis> passes and the pull request can
          be merged.
        </>
      ),
      reject: (
        <>The pull request stays blocked until the changes are fixed.</>
      ),
    };
  }

  // CI with a repository but no pull request: the check lives on the commit.
  if (hasRepository) {
    return {
      approve: (
        <>
          The <Emphasis>status check</Emphasis> passes on this commit.
        </>
      ),
      reject: <>The status check stays red until the changes are fixed.</>,
    };
  }

  // No repository connected: there's no status check, just the review verdict.
  return {
    approve: <>The changes are confirmed as expected.</>,
    reject: <>The changes are flagged as unexpected.</>,
  };
}

function OutcomeRow(props: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 translate-y-0.5">{props.icon}</span>
      <div className="text-low text-balance">
        <Emphasis className="text-default">{props.label}</Emphasis> —{" "}
        {props.children}
      </div>
    </div>
  );
}

/**
 * Always-visible, decision-time summary of what each verdict does. Sits next to
 * the review action so reviewers know the consequence before they commit to it.
 */
export function ReviewOutcomes(props: {
  build: Build;
  hasRepository: boolean;
  hasPullRequest: boolean;
}) {
  const isCi = props.build.mode === BuildMode.Ci;
  const { approve, reject } = getReviewOutcomes({
    isCi,
    hasRepository: props.hasRepository,
    hasPullRequest: props.hasPullRequest,
  });

  return (
    <div className="mt-1 flex flex-col gap-1.5 text-sm">
      <OutcomeRow
        icon={<CheckIcon className="text-success-low size-4" />}
        label="Approve"
      >
        {approve}
      </OutcomeRow>
      <OutcomeRow
        icon={<XIcon className="text-low size-4" />}
        label="Reject"
      >
        {reject}
      </OutcomeRow>
    </div>
  );
}
