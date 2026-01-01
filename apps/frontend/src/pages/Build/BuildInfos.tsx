import { assertNever } from "@argos/util/assertNever";
import clsx from "clsx";
import moment from "moment";

import {
  BuildModeDescription,
  BuildModeLabel,
} from "@/containers/BuildModeIndicator";
import { DocumentType, graphql } from "@/gql";
import { BaseBranchResolution, TestReportStatus } from "@/gql/graphql";
import { Link } from "@/ui/Link";
import { Time } from "@/ui/Time";
import { getTestReportStatusDescriptor } from "@/util/build";
import { lowTextColorClassNames } from "@/util/colors";

import { getProjectURL } from "../Project/ProjectParams";
import { BuildParams, getBuildURL } from "./BuildParams";

const _BuildFragment = graphql(`
  fragment BuildInfos_Build on Build {
    createdAt
    finalizedAt
    concludedAt
    name
    commit
    branch
    mode
    mergeQueue
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
    parallel {
      total
      received
      nonce
    }
  }
`);

function Dt(props: { children: React.ReactNode }) {
  return (
    <dt className="text-low mb-1 text-xs font-medium">{props.children}</dt>
  );
}

function Dd(props: { children: React.ReactNode }) {
  return (
    <dd className="text-default mb-6 text-sm font-medium">{props.children}</dd>
  );
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

function BuildLink(props: {
  accountSlug: string;
  projectName: string;
  buildNumber: number;
}) {
  return <Link href={getBuildURL(props)}>Build {props.buildNumber}</Link>;
}

function TestReportStatusLabel(props: { status: TestReportStatus }) {
  const descriptor = getTestReportStatusDescriptor(props.status);
  return (
    <>
      <div>
        <descriptor.icon
          className={clsx(
            "mr-1 inline-block",
            lowTextColorClassNames[descriptor.color],
          )}
          size="1em"
        />
        {descriptor.label}
      </div>
      <Description>{descriptor.description}</Description>
    </>
  );
}

function Description(props: { children: React.ReactNode }) {
  return (
    <p className="text-low mt-0.5 text-xs font-normal">{props.children}</p>
  );
}

function Duration({ start, end }: { start: string; end: string }) {
  const duration = moment.duration(moment(end).diff(moment(start)));
  return duration.humanize();
}

export function BuildInfos(props: {
  repoUrl: string | null;
  build: DocumentType<typeof _BuildFragment>;
  params: BuildParams;
}) {
  const { build, params } = props;
  return (
    <dl>
      <Dt>Created</Dt>
      <Dd>
        <Time date={build.createdAt} format="LLL" />
      </Dd>

      {build.finalizedAt ? (
        <>
          <Dt>Completed</Dt>
          <Dd>
            <Time date={build.finalizedAt} format="LLL" />
            <Description>
              <Duration start={build.createdAt} end={build.finalizedAt} />
            </Description>
          </Dd>
        </>
      ) : null}

      {build.concludedAt && build.finalizedAt ? (
        <>
          <Dt>Processed</Dt>
          <Dd>
            <Time date={build.concludedAt} format="LLL" />
            <Description>
              <Duration start={build.finalizedAt} end={build.concludedAt} />
            </Description>
          </Dd>
        </>
      ) : null}

      <Dt>Name</Dt>
      <Dd>{build.name}</Dd>

      <Dt>Mode</Dt>
      <Dd>
        <BuildModeLabel mode={build.mode} />
        <Description>
          <BuildModeDescription mode={build.mode} />
        </Description>
      </Dd>

      {build.mergeQueue ? (
        <>
          <Dt>Git environment</Dt>
          <Dd>
            Merge queue
            <Description>
              This build was triggered in a merge queue and has been compared
              with a previously approved build.
            </Description>
          </Dd>
        </>
      ) : null}

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
            accountSlug={params.accountSlug}
            projectName={params.projectName}
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
                  projectUrl={getProjectURL(params)}
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

      <Dt>Total screenshots</Dt>
      <Dd>{build.stats ? build.stats.total : "-"}</Dd>

      {build.parallel ? (
        <>
          {build.parallel.total === -1 ? (
            <>
              <Dt>Sharding</Dt>
              <Dd>Finalized manually</Dd>
            </>
          ) : (
            <>
              <Dt>Parallel shards</Dt>
              <Dd>
                {build.parallel.received} / {build.parallel.total}
              </Dd>
              <Dt>Parallel nonce</Dt>
              <Dd>
                <span className="font-mono font-medium">
                  {build.parallel.nonce}
                </span>
              </Dd>
            </>
          )}
        </>
      ) : null}
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
    <Link className="font-mono" href={props.pullRequest.url} target="_blank">
      #{props.pullRequest.number}
    </Link>
  );
}
