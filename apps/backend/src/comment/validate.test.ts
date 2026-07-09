import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import {
  isCommentTooLarge,
  sanitizeCommentJson,
  validateCommentJson,
} from "./validate";

const paragraph = (text?: string) =>
  text === undefined
    ? { type: "paragraph" }
    : { type: "paragraph", content: [{ type: "text", text }] };

function docWithText(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe("validateCommentJson", () => {
  describe("valid content", () => {
    it("accepts a simple paragraph", () => {
      expect(
        validateCommentJson({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello world!" }],
            },
          ],
        }),
      ).toBe(true);
    });

    it("accepts a doc with an empty paragraph (default editor state)", () => {
      expect(
        validateCommentJson({
          type: "doc",
          content: [{ type: "paragraph" }],
        }),
      ).toBe(true);
    });

    it("accepts inline marks", () => {
      expect(
        validateCommentJson({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "bold", marks: [{ type: "bold" }] },
                { type: "text", text: " " },
                { type: "text", text: "italic", marks: [{ type: "italic" }] },
                { type: "text", text: " " },
                { type: "text", text: "code", marks: [{ type: "code" }] },
              ],
            },
          ],
        }),
      ).toBe(true);
    });

    it("accepts bullet lists", () => {
      expect(
        validateCommentJson({
          type: "doc",
          content: [
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "first" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "second" }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ).toBe(true);
    });

    it("accepts headings with a valid level", () => {
      expect(
        validateCommentJson({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Title" }],
            },
          ],
        }),
      ).toBe(true);
    });
  });

  describe("invalid content", () => {
    it("rejects null", () => {
      expect(validateCommentJson(null)).toBe(false);
    });

    it("rejects undefined", () => {
      expect(validateCommentJson(undefined)).toBe(false);
    });

    it("rejects primitives", () => {
      expect(validateCommentJson("string")).toBe(false);
      expect(validateCommentJson(42)).toBe(false);
      expect(validateCommentJson(true)).toBe(false);
    });

    it("rejects objects with no type", () => {
      expect(validateCommentJson({})).toBe(false);
      expect(validateCommentJson({ content: [] })).toBe(false);
    });

    it("rejects unknown node types", () => {
      expect(
        validateCommentJson({
          type: "doc",
          content: [{ type: "unknownNode" }],
        }),
      ).toBe(false);
    });

    it("rejects unknown mark types", () => {
      expect(
        validateCommentJson({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "hi",
                  marks: [{ type: "unknownMark" }],
                },
              ],
            },
          ],
        }),
      ).toBe(false);
    });

    it("rejects non-doc top-level nodes", () => {
      expect(
        validateCommentJson({
          type: "paragraph",
          content: [{ type: "text", text: "no doc wrapper" }],
        }),
      ).toBe(false);
    });

    it("rejects invalid content structure", () => {
      // A paragraph only accepts inline content; nesting paragraphs is invalid.
      expect(
        validateCommentJson({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "nested" }],
                },
              ],
            },
          ],
        }),
      ).toBe(false);
    });

    it("rejects a doc with no blocks", () => {
      // doc content is `block+`, so at least one block is required.
      expect(validateCommentJson({ type: "doc", content: [] })).toBe(false);
    });

    it("rejects empty text nodes", () => {
      expect(
        validateCommentJson({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "" }],
            },
          ],
        }),
      ).toBe(false);
    });
  });
});

describe("sanitizeCommentJson", () => {
  it("strips leading blank paragraphs", () => {
    expect(
      sanitizeCommentJson({
        type: "doc",
        content: [paragraph(), paragraph(), paragraph("Hello")],
      }),
    ).toEqual({ type: "doc", content: [paragraph("Hello")] });
  });

  it("strips trailing blank paragraphs", () => {
    expect(
      sanitizeCommentJson({
        type: "doc",
        content: [paragraph("Hello"), paragraph(), paragraph()],
      }),
    ).toEqual({ type: "doc", content: [paragraph("Hello")] });
  });

  it("strips both leading and trailing blank paragraphs", () => {
    expect(
      sanitizeCommentJson({
        type: "doc",
        content: [paragraph(), paragraph("Hello"), paragraph()],
      }),
    ).toEqual({ type: "doc", content: [paragraph("Hello")] });
  });

  it("treats whitespace-only paragraphs as blank", () => {
    expect(
      sanitizeCommentJson({
        type: "doc",
        content: [paragraph("   "), paragraph("Hello")],
      }),
    ).toEqual({ type: "doc", content: [paragraph("Hello")] });
  });

  it("keeps blank paragraphs between content", () => {
    const content = [paragraph("a"), paragraph(), paragraph("b")];
    expect(sanitizeCommentJson({ type: "doc", content })).toEqual({
      type: "doc",
      content,
    });
  });

  it("returns the same value when there is nothing to trim", () => {
    const value = { type: "doc", content: [paragraph("Hello")] };
    expect(sanitizeCommentJson(value)).toBe(value);
  });

  it("strips leading and trailing line breaks within a paragraph", () => {
    expect(
      sanitizeCommentJson({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "hardBreak" },
              { type: "text", text: "Hello" },
              { type: "hardBreak" },
            ],
          },
        ],
      }),
    ).toEqual({ type: "doc", content: [paragraph("Hello")] });
  });

  it("keeps line breaks between text", () => {
    const content = [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "a" },
          { type: "hardBreak" },
          { type: "text", text: "b" },
        ],
      },
    ];
    expect(sanitizeCommentJson({ type: "doc", content })).toEqual({
      type: "doc",
      content,
    });
  });

  it("treats line-break-only paragraphs as blank", () => {
    expect(
      sanitizeCommentJson({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "hardBreak" }] },
          paragraph("Hello"),
        ],
      }),
    ).toEqual({ type: "doc", content: [paragraph("Hello")] });
  });

  it("trims trailing breaks on the last block and leading on the first", () => {
    expect(
      sanitizeCommentJson({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "hardBreak" }, { type: "text", text: "a" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "b" }, { type: "hardBreak" }],
          },
        ],
      }),
    ).toEqual({
      type: "doc",
      content: [paragraph("a"), paragraph("b")],
    });
  });

  it("does not strip non-paragraph blocks (e.g. headings)", () => {
    const content = [
      { type: "heading", attrs: { level: 2 }, content: [] },
      paragraph("Hello"),
    ];
    expect(sanitizeCommentJson({ type: "doc", content })).toEqual({
      type: "doc",
      content,
    });
  });

  it("leaves an all-blank doc reducible to empty (then rejected by isCommentEmpty)", () => {
    expect(
      sanitizeCommentJson({
        type: "doc",
        content: [paragraph(), paragraph()],
      }),
    ).toEqual({ type: "doc", content: [] });
  });
});

describe("isCommentTooLarge", () => {
  it("accepts a small comment", () => {
    expect(isCommentTooLarge(docWithText("Hello world!"))).toBe(false);
  });

  it("accepts a comment at the character limit", () => {
    expect(isCommentTooLarge(docWithText("a".repeat(2_000)))).toBe(false);
  });

  it("rejects a comment over the character limit", () => {
    expect(isCommentTooLarge(docWithText("a".repeat(2_001)))).toBe(true);
  });

  it("rejects a comment over the JSON byte limit", () => {
    // Few nodes and few characters, but a giant attribute value (a long link
    // href) blows the byte budget — only the byte check catches this.
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "x",
              marks: [
                {
                  type: "link",
                  attrs: { href: `https://example.com/${"a".repeat(45_000)}` },
                },
              ],
            },
          ],
        },
      ],
    };
    expect(isCommentTooLarge(doc)).toBe(true);
  });

  it("rejects a comment with too many nodes", () => {
    const content = Array.from({ length: 301 }, () => ({
      type: "paragraph",
    }));
    expect(isCommentTooLarge({ type: "doc", content })).toBe(true);
  });

  it("rejects a deeply nested comment", () => {
    let node: JSONContent = { type: "text", text: "deep" };
    for (let i = 0; i < 13; i++) {
      node = { type: "bulletList", content: [node] };
    }
    expect(isCommentTooLarge({ type: "doc", content: [node] })).toBe(true);
  });
});
