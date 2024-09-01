import { assertNever } from "@argos/util/assertNever";
import { CheckIcon } from "lucide-react";

import {
  BuildModeDescription,
  BuildModeLabel,
} from "@/containers/BuildModeIndicator";
import { FragmentType, graphql, useFragment } from "@/gql";
import { TestReportStatus } from "@/gql/graphql";
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
    return <>{branch}</>;
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

const BuildFragment = graphql(`
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
  }
`);

function Description(props: { children: React.ReactNode }) {
  return (
    <p className="text-low mt-0.5 text-xs font-normal">{props.children}</p>
  );
}

export function BuildInfos(props: {
  repoUrl: string | null;
  build: FragmentType<typeof BuildFragment>;
  params: BuildParams;
}) {
  const build = useFragment(BuildFragment, props.build);
  return (
    <dl>
      <Dt>Created</Dt>
      <Dd>{build ? <Time date={build.createdAt} format="LLL" /> : "-"}</Dd>

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
      <Dd>{build ? build.stats.total : "-"}</Dd>

      {build?.pullRequest ? (
        <>
          <Dt>Pull request</Dt>
          <Dd>
            <Link className="font-mono" href={build.pullRequest.url}>
              #{build.pullRequest.number}
            </Link>
          </Dd>
        </>
      ) : null}

      <Dt>Baseline build</Dt>
      <Dd>
        {build?.baseBuild ? (
          <BuildLink
            accountSlug={props.params.accountSlug}
            projectName={props.params.projectName}
            buildNumber={build.baseBuild.number}
          />
        ) : (
          "-"
        )}
      </Dd>

      <Dt>Baseline branch</Dt>
      <Dd>
        {build?.baseScreenshotBucket ? (
          <BranchLink
            repoUrl={props.repoUrl}
            branch={build.baseScreenshotBucket.branch}
          />
        ) : (
          "-"
        )}
      </Dd>

      <Dt>Baseline commit</Dt>
      <Dd>
        {build?.baseScreenshotBucket ? (
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
        {build ? (
          <BranchLink repoUrl={props.repoUrl} branch={build.branch} />
        ) : (
          "-"
        )}
      </Dd>

      <Dt>Changes commit</Dt>
      <Dd>
        {build ? (
          <CommitLink repoUrl={props.repoUrl} commit={build.commit} />
        ) : (
          "-"
        )}
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
