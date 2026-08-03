import { config } from "@/config";

import { getBuildURL } from "./BuildParams";

/**
 * A prompt to hand to a coding agent so it carries out what reviewers asked for
 * on a build — one thread, or every thread still open.
 *
 * The comments themselves are deliberately left out: the agent fetches them, and
 * in doing so also gets the snapshot each one hangs off and the anchor saying
 * where on it they point. Quoting the text here would flatten all of that, and a
 * comment on a visual review is rarely about its words alone — "this button"
 * only means something next to the capture.
 *
 * How to drive the CLI is left out too. The `argos-cli` skill ships with the CLI
 * and already carries the token model, the `--json` contract and every command's
 * flags, and `argos <command> --help` covers an agent that lacks it. Spelling out
 * REST routes here would only add a copy to keep in sync with the API.
 */
export function createHandleCommentsPrompt(input: {
  accountSlug: string;
  projectName: string;
  buildNumber: number;
  /**
   * Narrows the work to a single thread, by its root comment's public id — the
   * same id the API answers with. Every unresolved thread of the build when
   * left out.
   */
  threadId?: string | null;
}): string {
  const { accountSlug, projectName, buildNumber, threadId = null } = input;
  const buildUrl = new URL(
    getBuildURL({ accountSlug, projectName, buildNumber }),
    config.server.url,
  ).href;

  const lines = [
    "# Handle Argos review comments",
    "Reviewers left comments on an Argos visual review of this repository. Carry out what they ask for, here, in the code.",
    "",
    `- Argos build: ${buildUrl}`,
    ...(threadId ? [`- Thread to handle: \`${threadId}\``] : []),
    "",
    "Drive Argos through its CLI — load the `argos-cli` skill for the token model and the flags, or run `npx @argos-ci/cli comment --help`.",
    "",
    threadId
      ? `1. Read the thread: \`argos comment get ${buildUrl} ${threadId} --json\`, and its replies — the comments whose \`threadId\` is \`${threadId}\` in \`argos comment list ${buildUrl} --json\`. Leave the rest of the build alone.`
      : `1. Read the comments: \`argos comment list ${buildUrl} --json\`. Take every thread whose root has no \`resolvedAt\` — the others are done. Skip the \`pending\` ones: they are drafts of a review nobody has submitted.`,
    `2. See what each one points at. A comment carries \`screenshotDiffId\` and an \`anchor\` (a point in normalized 0-1 coordinates, or a line range) but no image, so match it against \`argos build snapshots ${buildUrl} --json\` and open that diff's \`url\`, \`base.url\` and \`head.url\`. A comment names its target loosely — "this button" — and the capture says which one it is.`,
    "3. Do what it asks, in this repository. When it asks a question rather than for a change, answer it instead of touching the code. Keep to what was asked, and leave the rest of the visual diff alone. Run the repository's checks, then commit following its conventions.",
    `4. Reply in the thread — \`argos comment create ${buildUrl} --reply-to ${threadId ?? "<rootCommentId>"} --body "..."\` — and resolve it only once its change is committed. Leave open what you could not handle, and say why in the reply.`,
    "",
    "The captures only change on the next build, so this build's diffs will not move.",
  ];

  return lines.join("\n");
}
