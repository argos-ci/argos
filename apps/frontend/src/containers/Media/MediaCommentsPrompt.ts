/**
 * A prompt to hand to a coding agent so it carries out what a reviewer asked
 * for on a shared media — one thread.
 *
 * The comments themselves are deliberately left out: the agent fetches them,
 * and in doing so also gets the anchor saying where on the image they point. A
 * comment on a visual review is rarely about its words alone — "this button"
 * only means something next to the capture.
 *
 * How to drive the CLI is left out too. The `argos-cli` skill ships with the
 * CLI and already carries the token model, the `--json` contract and every
 * command's flags, and `argos <command> --help` covers an agent that lacks it.
 */
export function createHandleMediaCommentsPrompt(input: {
  /** The media's share page URL — the handle every Argos CLI command takes. */
  shareUrl: string;
  /** The thread to handle, by its root comment's public id. */
  threadId: string;
}): string {
  const { shareUrl, threadId } = input;

  return [
    "# Handle Argos media comments",
    "A reviewer left comments on a media shared with Argos (a screenshot or recording uploaded from this repository). Carry out what they ask for, here, in the code.",
    "",
    `- Shared media: ${shareUrl}`,
    `- Thread to handle: \`${threadId}\``,
    "",
    "Drive Argos through its CLI — load the `argos-cli` skill for the token model and the flags, or run `npx @argos-ci/cli comment --help`.",
    "",
    `1. Read the thread: \`argos comment get ${shareUrl} ${threadId} --json\`, and its replies — the comments whose \`threadId\` is \`${threadId}\` in \`argos comment list ${shareUrl} --json\`. Leave the media's other threads alone.`,
    `2. See what it points at. A comment carries an \`anchor\` (a point in normalized 0-1 coordinates) but no image, so open the media itself from ${shareUrl} — a before/after pair shows both halves there. A comment names its target loosely — "this button" — and the capture says which one it is.`,
    "3. Do what it asks, in this repository. When it asks a question rather than for a change, answer it instead of touching the code. Keep to what was asked. Run the repository's checks, then commit following its conventions.",
    `4. Reply in the thread — \`argos comment create ${shareUrl} --reply-to ${threadId} --body "..."\` — and resolve it only once its change is committed. Leave it open if you could not handle it, and say why in the reply.`,
    "",
    "The media only changes when a new version is uploaded, so what the comments point at will not move under you.",
  ].join("\n");
}
