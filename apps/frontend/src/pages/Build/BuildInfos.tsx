import { assertNever } from "@argos/util/assertNever";
import { CheckIcon } from "lucide-react";

import {
  BuildModeDescription,
  BuildModeLabel,
} from "@/containers/BuildModeIndicator";
import { DocumentType, graphql } from "@/gql";
import { BaseBranchResolution, TestReportStatus } from "@/gql/graphql";
import { Link } from "@/ui/Link";
import { Time } from "@/ui/Time";

import { BuildParams } from "./BuildParams";

function Dt(props: { children: React.ReactNode }) {
  return (
    <dt className="text-low mb-1 text-xs font-medium">{props.children}</dt>
  );
}

function Dd(props: { children: React.ReactNode }) {
  return <dd className="text mb-6 text-sm font-medium">{props.children}</dd>;
}

function CommitLink({
  repoUrl,
  commit,
}: {
  repoUrl: string | null;
  commit: string;
}) {
  const shortCommit = commit.slice(0, 7);
  if (!repoUrl) {
    return <>{shortCommit}</>;
  }
  return (
    <Link
      className="font-mono"
      href={`${repoUrl}/commit/${commit}`}
      target="_blank"
    >
      {shortCommit}
    </Link>
  );
}

function BranchLink({
  repoUrl,
  branch,
}: {
  repoUrl: string | null;
  branch: string;
}) {
  if (!repoUrl) {
    return <span className="font-mono">{branch}</span>;
  }
  return (
    <Link
      className="font-mono"
      href={`${repoUrl}/tree/${branch}`}
      target="_blank"
    >
      {branch}
    </Link>
  );
}

function BuildLink({
  accountSlug,
  projectName,
  buildNumber,
}: {
  accountSlug: string;
  projectName: string;
  buildNumber: number;
}) {
  return (
    <Link href={`/${accountSlug}/${projectName}/builds/${buildNumber}`}>
      Build {buildNumber}
    </Link>
  );
}

function TestReportStatusLabel(props: { status: TestReportStatus }) {
  switch (props.status) {
    case TestReportStatus.Passed:
      return (
        <>
          <div>
            <CheckIcon
              className="text-success-low mr-1 inline-block"
              size="1em"
            />
            Passed
          </div>
          <Description>
            All tests passed successfully. This build is eligible to be used as
            a baseline.
          </Description>
        </>
      );
    case TestReportStatus.Failed:
    case TestReportStatus.Timedout:
    case TestReportStatus.Interrupted:
      return (
        <>
          <>
            <CheckIcon
              className="text-danger-low mr-1 inline-block"
              size="1em"
            />
            Failed
          </>
          <Description>
            Some tests failed. This build is not eligible to be used as a
            baseline.
          </Description>
        </>
      );
    default:
      assertNever(props.status);
  }
}

const _BuildFragment = graphql(`
  fragment BuildInfos_Build on Build {
    createdAt
    name
    commit
    branch
    mode
    stats {
      total
    }
    baseScreenshotBucket {
      id
      commit
      branch
    }
    baseBuild {
      id
      number
    }
    pullRequest {
      id
      url
      number
    }
    metadata {
      testReport {
        status
      }
    }
    baseBranch
    baseBranchResolvedFrom
  }
`);

function Description(props: { children: React.ReactNode }) {
  return (
    <p className="text-low mt-0.5 text-xs font-normal">{props.children}</p>
  );
}

export function BuildInfos(props: {
  repoUrl: string | null;
  build: DocumentType<typeof _BuildFragment>;
  params: BuildParams;
}) {
  const { build } = props;
  return (
    <dl>
      <Dt>Created</Dt>
      <Dd>
        <Time date={build.createdAt} format="LLL" />
      </Dd>

      <Dt>Name</Dt>
      <Dd>{build.name}</Dd>

      <Dt>Mode</Dt>
      <Dd>
        <BuildModeLabel mode={build.mode} />
        <Description>
          <BuildModeDescription mode={build.mode} />
        </Description>
      </Dd>

      <Dt>Total screenshots count</Dt>
      <Dd>{build.stats ? build.stats.total : "-"}</Dd>

      {build.pullRequest ? (
        <>
          <Dt>Pull request</Dt>
          <Dd>
            <PullRequestLink pullRequest={build.pullRequest} />
          </Dd>
        </>
      ) : null}

      <Dt>Baseline build</Dt>
      <Dd>
        {build.baseBuild ? (
          <BuildLink
            accountSlug={props.params.accountSlug}
            projectName={props.params.projectName}
            buildNumber={build.baseBuild.number}
          />
        ) : (
          "-"
        )}
      </Dd>

      {build.baseBranch ? (
        <>
          <Dt>Base branch</Dt>
          <Dd>
            <BranchLink repoUrl={props.repoUrl} branch={build.baseBranch} />
            {build.baseBranchResolvedFrom ? (
              <Description>
                <BaseBranchResolvedFrom
                  projectUrl={`/${props.params.accountSlug}/${props.params.projectName}`}
                  resolvedFrom={build.baseBranchResolvedFrom}
                  pullRequest={build.pullRequest}
                />
              </Description>
            ) : null}
          </Dd>
        </>
      ) : null}

      <Dt>Base commit</Dt>
      <Dd>
        {build.baseScreenshotBucket ? (
          <CommitLink
            repoUrl={props.repoUrl}
            commit={build.baseScreenshotBucket.commit}
          />
        ) : (
          "-"
        )}
      </Dd>

      <Dt>Changes branch</Dt>
      <Dd>
        {build.branch ? (
          <BranchLink repoUrl={props.repoUrl} branch={build.branch} />
        ) : (
          "-"
        )}
      </Dd>

      <Dt>Changes commit</Dt>
      <Dd>
        <CommitLink repoUrl={props.repoUrl} commit={build.commit} />
      </Dd>

      {build.metadata?.testReport?.status && (
        <>
          <Dt>Tests status</Dt>
          <Dd>
            <TestReportStatusLabel status={build.metadata.testReport.status} />
          </Dd>
        </>
      )}
    </dl>
  );
}

function BaseBranchResolvedFrom(props: {
  resolvedFrom: BaseBranchResolution;
  projectUrl: string;
  pullRequest: DocumentType<typeof _BuildFragment>["pullRequest"];
}) {
  const { resolvedFrom, pullRequest } = props;
  switch (resolvedFrom) {
    case BaseBranchResolution.Project:
      return (
        <>
          Resolved from default base branch set in{" "}
          <Link href={props.projectUrl}>project settings</Link>.
        </>
      );
    case BaseBranchResolution.PullRequest:
      return (
        <>
          Resolved from base branch of the pull-request
          {pullRequest ? (
            <>
              {" "}
              <PullRequestLink pullRequest={pullRequest} />
            </>
          ) : null}
          .
        </>
      );
    case BaseBranchResolution.User:
      return "Resolved from user-defined base branch in SDK.";
    default:
      assertNever(resolvedFrom);
  }
}

function PullRequestLink(props: {
  pullRequest: NonNullable<DocumentType<typeof _BuildFragment>["pullRequest"]>;
}) {
  return (
    <Link className="font-mono" href={props.pullRequest.url}>
      #{props.pullRequest.number}
    </Link>
  );
}
