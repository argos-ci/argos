import { FragmentType, graphql, useFragment } from "@/gql";
import { Anchor } from "@/ui/Link";
import { Time } from "@/ui/Time";

const Dt = ({ children }: { children: React.ReactNode }) => {
  return <dt className="mb-1 text-xs font-medium text-low">{children}</dt>;
};

const Dd = ({ children }: { children: React.ReactNode }) => {
  return <dd className="mb-6 text-sm font-medium text">{children}</dd>;
};

const CommitLink = ({
  githubRepoUrl,
  commit,
}: {
  githubRepoUrl: string | null;
  commit: string;
}) => {
  const shortCommit = commit.slice(0, 7);
  if (!githubRepoUrl) {
    return <>{shortCommit}</>;
  }
  return (
    <Anchor className="font-mono" href={`${githubRepoUrl}/commit/${commit}`}>
      {shortCommit}
    </Anchor>
  );
};

const BranchLink = ({
  githubRepoUrl,
  branch,
}: {
  githubRepoUrl: string | null;
  branch: string;
}) => {
  if (!githubRepoUrl) return <>{branch}</>;
  return (
    <Anchor className="font-mono" href={`${githubRepoUrl}/tree/${branch}`}>
      {branch}
    </Anchor>
  );
};

const PullRequestLink = ({
  githubRepoUrl,
  prNumber,
}: {
  githubRepoUrl: string;
  prNumber: number;
}) => {
  return (
    <Anchor className="font-mono" href={`${githubRepoUrl}/pull/${prNumber}`}>
      #{prNumber}
    </Anchor>
  );
};

export const BuildFragment = graphql(`
  fragment BuildInfos_Build on Build {
    createdAt
    name
    prNumber
    commit
    branch
    stats {
      total
    }
    baseScreenshotBucket {
      commit
      branch
    }
  }
`);

export const BuildInfos = (props: {
  githubRepoUrl: string | null;
  build: FragmentType<typeof BuildFragment>;
}) => {
  const build = useFragment(BuildFragment, props.build);
  return (
    <dl>
      <Dt>Created</Dt>
      <Dd>{build ? <Time date={build.createdAt} format="LLL" /> : "-"}</Dd>

      <Dt>Build name</Dt>
      <Dd>{build.name}</Dd>

      <Dt>Total screenshots count</Dt>
      <Dd>{build ? build.stats.total : "-"}</Dd>

      {build?.prNumber && props.githubRepoUrl ? (
        <>
          <Dt>Pull request</Dt>
          <Dd>
            <PullRequestLink
              githubRepoUrl={props.githubRepoUrl}
              prNumber={build.prNumber}
            />
          </Dd>
        </>
      ) : null}

      <Dt>Baseline branch</Dt>
      <Dd>
        {build?.baseScreenshotBucket ? (
          <BranchLink
            githubRepoUrl={props.githubRepoUrl}
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
            githubRepoUrl={props.githubRepoUrl}
            commit={build.baseScreenshotBucket.commit}
          />
        ) : (
          "-"
        )}
      </Dd>

      <Dt>Changes branch</Dt>
      <Dd>
        {build ? (
          <BranchLink
            githubRepoUrl={props.githubRepoUrl}
            branch={build.branch}
          />
        ) : (
          "-"
        )}
      </Dd>

      <Dt>Changes commit</Dt>
      <Dd>
        {build ? (
          <CommitLink
            githubRepoUrl={props.githubRepoUrl}
            commit={build.commit}
          />
        ) : (
          "-"
        )}
      </Dd>
    </dl>
  );
};
