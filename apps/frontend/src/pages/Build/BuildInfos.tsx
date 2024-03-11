import { FragmentType, graphql, useFragment } from "@/gql";
import { Anchor } from "@/ui/Anchor";
import { Time } from "@/ui/Time";

const Dt = ({ children }: { children: React.ReactNode }) => {
  return <dt className="mb-1 text-xs font-medium text-low">{children}</dt>;
};

const Dd = ({ children }: { children: React.ReactNode }) => {
  return <dd className="mb-6 text-sm font-medium text">{children}</dd>;
};

const CommitLink = ({
  repoUrl,
  commit,
}: {
  repoUrl: string | null;
  commit: string;
}) => {
  const shortCommit = commit.slice(0, 7);
  if (!repoUrl) {
    return <>{shortCommit}</>;
  }
  return (
    <Anchor className="font-mono" href={`${repoUrl}/commit/${commit}`}>
      {shortCommit}
    </Anchor>
  );
};

const BranchLink = ({
  repoUrl,
  branch,
}: {
  repoUrl: string | null;
  branch: string;
}) => {
  if (!repoUrl) return <>{branch}</>;
  return (
    <Anchor className="font-mono" href={`${repoUrl}/tree/${branch}`}>
      {branch}
    </Anchor>
  );
};

const BuildFragment = graphql(`
  fragment BuildInfos_Build on Build {
    createdAt
    name
    commit
    branch
    stats {
      total
    }
    baseScreenshotBucket {
      commit
      branch
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
