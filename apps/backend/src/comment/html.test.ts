import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { renderCommentHtml } from "./html";

describe("renderCommentHtml", () => {
  it("renders a simple paragraph", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world!" }],
        },
      ],
    };
    expect(renderCommentHtml(doc)).toBe("<p>Hello world!</p>");
  });

  it("renders inline marks (bold, italic, code)", () => {
    const doc: JSONContent = {
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
    };
    expect(renderCommentHtml(doc)).toBe(
      "<p><strong>bold</strong> <em>italic</em> <code>code</code></p>",
    );
  });

  it("renders links with href", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Argos",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://argos-ci.com" },
                },
              ],
            },
          ],
        },
      ],
    };
    expect(renderCommentHtml(doc)).toContain(
      '<a target="_blank" rel="noopener noreferrer nofollow" href="https://argos-ci.com">Argos</a>',
    );
  });

  it("renders bullet lists", () => {
    const doc: JSONContent = {
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
    };
    expect(renderCommentHtml(doc)).toBe(
      "<ul><li><p>first</p></li><li><p>second</p></li></ul>",
    );
  });

  it("renders an empty document as an empty string", () => {
    const doc: JSONContent = { type: "doc", content: [] };
    expect(renderCommentHtml(doc)).toBe("");
  });

  it("renders a mention's label from the provided map", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hey " },
            { type: "mention", attrs: { id: "42" } },
          ],
        },
      ],
    };
    expect(renderCommentHtml(doc, new Map([["42", "Alice"]]))).toContain(
      "@Alice",
    );
  });

  it("falls back to @unknown for an unresolved mention", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "mention", attrs: { id: "42" } }],
        },
      ],
    };
    expect(renderCommentHtml(doc, new Map())).toContain("@unknown");
  });

  it("escapes HTML in text nodes", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "<script>alert(1)</script>" }],
        },
      ],
    };
    expect(renderCommentHtml(doc)).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });
});
