import type { Build } from "@/modern/containers/Build";
import { Link } from "@/modern/ui/Link";
import { Time } from "@/modern/ui/Time";

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
    <Link className="font-mono" to={`${githubRepoUrl}/commit/${commit}`}>
      {commit.slice(0, 7)}
    </Link>
  );
};

export interface BuildInfosProps {
  build:
    | (Pick<Build, "createdAt"> & {
        stats: Pick<Build["stats"], "total">;
        baseScreenshotBucket: Pick<
          Exclude<Build["baseScreenshotBucket"], null>,
          "commit"
        > | null;
        compareScreenshotBucket: Pick<
          Build["compareScreenshotBucket"],
          "commit"
        >;
      })
    | null;
  githubRepoUrl: string;
}

export const BuildInfos = ({ build, githubRepoUrl }: BuildInfosProps) => {
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
            githubRepoUrl={githubRepoUrl}
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
            githubRepoUrl={githubRepoUrl}
            commit={build.compareScreenshotBucket.commit}
          />
        ) : (
          "-"
        )}
      </Dd>
    </dl>
  );
};
