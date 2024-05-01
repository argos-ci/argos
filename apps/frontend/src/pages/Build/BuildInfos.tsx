import {
  BuildModeDescription,
  BuildModeLabel,
} from "@/containers/BuildModeIndicator";
import { FragmentType, graphql, useFragment } from "@/gql";
import { Anchor } from "@/ui/Anchor";
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
    <Anchor className="font-mono" href={`${repoUrl}/commit/${commit}`}>
      {shortCommit}
    </Anchor>
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
    <Anchor className="font-mono" href={`${repoUrl}/tree/${branch}`}>
      {branch}
    </Anchor>
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
    <Link to={`/${accountSlug}/${projectName}/builds/${buildNumber}`}>
      Build {buildNumber}
    </Link>
  );
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
  }
`);

export const BuildInfos = (props: {
  repoUrl: string | null;
  build: FragmentType<typeof BuildFragment>;
  params: BuildParams;
}) => {
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
        <div className="text-low mt-0.5 text-xs font-normal">
          <BuildModeDescription mode={build.mode} />
        </div>
      </Dd>

      <Dt>Total screenshots count</Dt>
      <Dd>{build ? build.stats.total : "-"}</Dd>

      {build?.pullRequest ? (
        <>
          <Dt>Pull request</Dt>
          <Dd>
            <Anchor className="font-mono" href={build.pullRequest.url}>
              #{build.pullRequest.number}
            </Anchor>
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
    </dl>
  );
};
