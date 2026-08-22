import { Link } from "@/ui/Link";

/**
 * A git branch name linking to the branch on the repository host, or plain
 * monospace text when the repository URL is unknown.
 */
export function BranchLink(props: { repoUrl: string | null; branch: string }) {
  const { repoUrl, branch } = props;
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

/**
 * A git commit SHA (shortened) linking to the commit on the repository host, or
 * plain text when the repository URL is unknown.
 */
export function CommitLink(props: { repoUrl: string | null; commit: string }) {
  const { repoUrl, commit } = props;
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
