import { DocumentType, graphql } from "@/gql";

const _BuildReviewPromptPullRequestFragment = graphql(`
  fragment BuildReviewPrompt_PullRequest on GithubPullRequest {
    id
    number
    url
    title
    draft
    merged
    creator {
      login
      name
    }
  }
`);

function formatPullRequestAuthor(
  pullRequest:
    | DocumentType<typeof _BuildReviewPromptPullRequestFragment>
    | null
    | undefined,
) {
  if (!pullRequest?.creator) {
    return null;
  }

  return pullRequest.creator.name
    ? `${pullRequest.creator.name} (@${pullRequest.creator.login})`
    : `@${pullRequest.creator.login}`;
}

function formatPullRequestStatus(
  pullRequest:
    | DocumentType<typeof _BuildReviewPromptPullRequestFragment>
    | null
    | undefined,
) {
  if (!pullRequest) {
    return null;
  }

  const flags = [
    pullRequest.draft ? "draft" : null,
    pullRequest.merged ? "merged" : null,
  ].filter(Boolean);

  return flags.length > 0 ? flags.join(", ") : null;
}

export function createBuildReviewPrompt(input: {
  buildUrl: string;
  pullRequest:
    | DocumentType<typeof _BuildReviewPromptPullRequestFragment>
    | null
    | undefined;
}) {
  const pullRequest = input.pullRequest;
  const prAuthor = formatPullRequestAuthor(pullRequest);
  const prStatus = formatPullRequestStatus(pullRequest);
  const lines = [
    "# Review Argos Build",
    "Review this Argos build using the build itself, the pull request context, and any extra context provided by the user.",
    "Use `$argos-pr-review` skill if available.",
    "",
    "## Context",
    `- Argos build: ${input.buildUrl}`,
    `- Pull request: ${pullRequest ? pullRequest.url : "not linked in Argos"}`,
    ...(pullRequest?.title ? [`- PR title: ${pullRequest.title}`] : []),
    ...(prAuthor ? [`- PR author: ${prAuthor}`] : []),
    ...(prStatus ? [`- PR status: ${prStatus}`] : []),
    "",
    "## Basic CLI Usage",
    "- Install globally: `npm install -g @argos-ci/cli`",
    "- Or use without installing globally: `npx @argos-ci/cli --help`",
    "- Show help: `argos --help`",
    "- Authenticate: `argos login`",
    "",
    "## Authentication",
    "- If you find a relevant `ARGOS_TOKEN` in CI files, use it.",
    "- Otherwise ask the user to run `argos login`.",
    "",
    "## Review Instructions",
    "- Use the Argos CLI (`@argos-ci/cli`).",
    "- Check the build status first. Pending, failed, aborted, or incomplete builds are not reviewable.",
    "- Review only what Argos can actually show you. If evidence is partial, say so clearly.",
    "- Inspect every snapshot that needs review.",
    "- Group duplicate visual changes and inspect one representative unless browser-specific differences matter.",
    "- Infer intent from the PR title, description, comments, commit messages, code diff, linked issues you can access, and the user's instructions.",
    "- Compare base, head, and diff images before drawing a conclusion.",
    "- Call out regressions, instability, incomplete data, or insufficient evidence explicitly.",
    "- Stay focused on reviewing the build.",
    "",
    "## Response Format",
    "- Inferred intent",
    "- Diffs reviewed",
    "- Evidence",
    "- Conclusion",
    "If blocked, report the exact blocker.",
  ];

  return lines.join("\n");
}
