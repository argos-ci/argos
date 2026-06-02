import { describe, expect, it } from "vitest";

import { extractMentionedAccountIds } from "./mentions";

function mentionDoc(accountIds: string[]) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hey " },
          ...accountIds.map((id) => ({
            type: "mention",
            attrs: { id, label: `user-${id}` },
          })),
        ],
      },
    ],
  };
}

describe("extractMentionedAccountIds", () => {
  it("collects ids from mention nodes, de-duplicated", () => {
    expect(extractMentionedAccountIds(mentionDoc(["1", "2", "1"]))).toEqual([
      "1",
      "2",
    ]);
  });

  it("collects mentions nested in lists and quotes", () => {
    expect(
      extractMentionedAccountIds({
        type: "doc",
        content: [
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [{ type: "mention", attrs: { id: "42", label: "x" } }],
              },
            ],
          },
        ],
      }),
    ).toEqual(["42"]);
  });

  it("returns an empty array when there are no mentions", () => {
    expect(
      extractMentionedAccountIds({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "hi" }] },
        ],
      }),
    ).toEqual([]);
  });

  it("ignores malformed input", () => {
    expect(extractMentionedAccountIds(null)).toEqual([]);
    expect(extractMentionedAccountIds("nope")).toEqual([]);
    expect(
      extractMentionedAccountIds({
        type: "doc",
        content: [{ type: "mention", attrs: {} }],
      }),
    ).toEqual([]);
  });

  it("does not throw when `content` is not an array", () => {
    expect(extractMentionedAccountIds({ type: "doc", content: 42 })).toEqual(
      [],
    );
    expect(
      extractMentionedAccountIds({ type: "doc", content: { nope: true } }),
    ).toEqual([]);
  });
});
