import { describe, expect, it } from "vitest";

import { validateCommentJson } from "./validate";

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
