import { describe, expect, it } from "vitest";

import { emailToText } from "@/email/util";

import type { NotificationHandler } from "../workflow-types";
import { handler as commentAdded } from "./comment_added";
import { handler as commentMention } from "./comment_mention";
import { handler as commentReaction } from "./comment_reaction";
import { handler as commentReplied } from "./comment_replied";
import { getCommentTargetLabel } from "./commentTarget";

const ctx = { user: { id: "user-1", name: "James" }, preferencesUrl: null };

const BUILD_TARGET = { buildNumber: 42, buildName: "default" };
const TEST_TARGET = { testName: "Header renders" };
const MEDIA_TARGET = { mediaName: "checkout.png" };
const NO_TARGET = {};

/**
 * Every comment notification carries the same target fields, so each case is
 * built from the handler's own preview payload with only the target swapped —
 * the assertions stay valid as handlers gain fields of their own.
 */
function withTarget(
  handler: NotificationHandler,
  target: Record<string, unknown>,
) {
  return {
    ...handler.previewData,
    buildNumber: undefined,
    buildName: undefined,
    testName: undefined,
    mediaName: undefined,
    ...target,
  };
}

const handlers: { name: string; handler: NotificationHandler }[] = [
  { name: "comment_added", handler: commentAdded },
  { name: "comment_replied", handler: commentReplied },
  { name: "comment_mention", handler: commentMention },
  { name: "comment_reaction", handler: commentReaction },
];

describe("getCommentTargetLabel", () => {
  it("names a build, with its name when it has one", () => {
    expect(getCommentTargetLabel(BUILD_TARGET)).toBe("build default #42");
    expect(getCommentTargetLabel({ buildNumber: 42 })).toBe("build #42");
  });

  it("names a test", () => {
    expect(getCommentTargetLabel(TEST_TARGET)).toBe("test Header renders");
  });

  it("names a media by its file name alone", () => {
    // No noun in front: "media checkout.png" reads like a category nobody uses.
    expect(getCommentTargetLabel(MEDIA_TARGET)).toBe("checkout.png");
  });

  it("throws when the payload names none of them", () => {
    expect(() => getCommentTargetLabel(NO_TARGET)).toThrow(
      "A comment notification must name its target",
    );
  });
});

describe.each(handlers)("$name", ({ handler }) => {
  it("renders the build it was posted on", async () => {
    const rendered = handler.email({
      ...withTarget(handler, BUILD_TARGET),
      ctx,
    });
    const html = await emailToText(rendered);
    expect(html).toContain("build default #42");
    expect(html).not.toContain("Header renders");
  });

  it("renders the test it was posted on", async () => {
    const rendered = handler.email({
      ...withTarget(handler, TEST_TARGET),
      ctx,
    });
    const html = await emailToText(rendered);
    expect(html).toContain("test Header renders");
    // No stray "build …" wording left over from the build-only copy.
    expect(html).not.toContain("build default");
  });

  it("renders the media it was posted on", async () => {
    const rendered = handler.email({
      ...withTarget(handler, MEDIA_TARGET),
      ctx,
    });
    const html = await emailToText(rendered);
    expect(html).toContain("checkout.png");
    expect(html).not.toContain("build default");
  });

  it("accepts any target and rejects a payload naming none", () => {
    expect(
      handler.schema.safeParse(withTarget(handler, BUILD_TARGET)).success,
    ).toBe(true);
    expect(
      handler.schema.safeParse(withTarget(handler, TEST_TARGET)).success,
    ).toBe(true);
    expect(
      handler.schema.safeParse(withTarget(handler, MEDIA_TARGET)).success,
    ).toBe(true);
    expect(
      handler.schema.safeParse(withTarget(handler, NO_TARGET)).success,
    ).toBe(false);
  });
});
