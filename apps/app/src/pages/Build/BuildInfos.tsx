import { FragmentType, graphql, useFragment } from "@/gql";
import { Anchor } from "@/ui/Link";
import { Time } from "@/ui/Time";

const Dt = ({ children }: { children: React.ReactNode }) => {
  return <dt className="mb-1 text-xs font-medium text-on-light">{children}</dt>;
};

const Dd = ({ children }: { children: React.ReactNode }) => {
  return <dd className="mb-6 text-sm font-medium text-on">{children}</dd>;
};

const CommitLink = ({
  githubRepoUrl,
  commit,
}: {
  githubRepoUrl: string;
  commit: string;
}) => {
  return (
    <Anchor className="font-mono" href={`${githubRepoUrl}/commit/${commit}`}>
      {commit.slice(0, 7)}
    </Anchor>
  );
};

export const BuildFragment = graphql(`
  fragment BuildInfos_Build on Build {
    createdAt
    stats {
      total
    }
    baseScreenshotBucket {
      commit
    }
    compareScreenshotBucket {
      commit
    }
  }
`);

export const BuildInfos = (props: {
  githubRepoUrl: string;
  build: FragmentType<typeof BuildFragment>;
}) => {
  const build = useFragment(BuildFragment, props.build);
  return (
    <dl>
      <Dt>Created</Dt>
      <Dd>{build ? <Time date={build.createdAt} format="LLL" /> : "-"}</Dd>

      {/* <Dt>Baseline build</Dt>
      <Dd>Build {buildNumber}</Dd> */}

      <Dt>Total screenshots count</Dt>
      <Dd>{build ? build.stats.total : "-"}</Dd>

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

      <Dt>Changes commit</Dt>
      <Dd>
        {build ? (
          <CommitLink
            githubRepoUrl={props.githubRepoUrl}
            commit={build.compareScreenshotBucket.commit}
          />
        ) : (
          "-"
        )}
      </Dd>
    </dl>
  );
};
