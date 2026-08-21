import { Link } from "@/ui/Link";

/**
 * A git branch name linking to the branch on the repository host, or plain
 * monospace text when the repository URL is unknown.
 */
export function BranchLink(props: {
  repoUrl: string | null;
  branch: string;
  /**
   * Whether the link carries the external-link icon. Turn it off in tight
   * quarters (e.g. a hover card): browsers may wrap the icon to a line of its
   * own next to a long branch name, and no glue character prevents it —
   * Chromium breaks around an inline SVG even across a no-break space.
   *
   * @default true
   */
  externalIcon?: boolean;
}) {
  const { repoUrl, branch, externalIcon } = props;
  if (!repoUrl) {
    return <span className="font-mono">{branch}</span>;
  }
  return (
    <Link
      className="font-mono"
      href={`${repoUrl}/tree/${branch}`}
      target="_blank"
      external={externalIcon}
    >
      {branch}
    </Link>
  );
}

/**
 * A git commit SHA (shortened) linking to the commit on the repository host, or
 * plain text when the repository URL is unknown.
 */
export function CommitLink(props: {
  repoUrl: string | null;
  commit: string;
  /** See {@link BranchLink}'s `externalIcon`. */
  externalIcon?: boolean;
}) {
  const { repoUrl, commit, externalIcon } = props;
  const shortCommit = commit.slice(0, 7);
  if (!repoUrl) {
    return <>{shortCommit}</>;
  }
  return (
    <Link
      className="font-mono"
      href={`${repoUrl}/commit/${commit}`}
      target="_blank"
      external={externalIcon}
    >
      {shortCommit}
    </Link>
  );
}
