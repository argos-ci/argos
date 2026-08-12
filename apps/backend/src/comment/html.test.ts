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
    expect(renderCommentHtml(doc, { mentionLabels: new Map() })).toBe(
      "<p>Hello world!</p>",
    );
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
    expect(renderCommentHtml(doc, { mentionLabels: new Map() })).toBe(
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
    expect(renderCommentHtml(doc, { mentionLabels: new Map() })).toContain(
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
    expect(renderCommentHtml(doc, { mentionLabels: new Map() })).toBe(
      "<ul><li><p>first</p></li><li><p>second</p></li></ul>",
    );
  });

  it("renders an empty document as an empty string", () => {
    const doc: JSONContent = { type: "doc", content: [] };
    expect(renderCommentHtml(doc, { mentionLabels: new Map() })).toBe("");
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
    expect(
      renderCommentHtml(doc, { mentionLabels: new Map([["42", "Alice"]]) }),
    ).toContain("@Alice");
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
    expect(renderCommentHtml(doc, { mentionLabels: new Map() })).toContain(
      "@unknown",
    );
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
    expect(renderCommentHtml(doc, { mentionLabels: new Map() })).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });
});

describe("renderCommentHtml commit autolinking", () => {
  const REPOSITORY_URL = "https://github.com/argos-ci/argos";

  /** Render a one-paragraph document made of the given inline nodes. */
  function render(
    content: JSONContent[],
    options?: { repositoryUrl?: string | null },
  ): string {
    return renderCommentHtml(
      { type: "doc", content: [{ type: "paragraph", content }] },
      { mentionLabels: new Map(), ...options },
    );
  }

  it("links a commit sha to the repository", () => {
    expect(
      render([{ type: "text", text: "Pushed to the PR in d15cba5." }], {
        repositoryUrl: REPOSITORY_URL,
      }),
    ).toBe(
      "<p>Pushed to the PR in " +
        '<a target="_blank" rel="noopener noreferrer nofollow" ' +
        `href="${REPOSITORY_URL}/commit/d15cba5">d15cba5</a>.</p>`,
    );
  });

  it("links every sha in the text", () => {
    const html = render(
      [{ type: "text", text: "Squashed abc1234 and 7fed210" }],
      {
        repositoryUrl: REPOSITORY_URL,
      },
    );
    expect(html).toContain(
      `href="${REPOSITORY_URL}/commit/abc1234">abc1234</a>`,
    );
    expect(html).toContain(
      `href="${REPOSITORY_URL}/commit/7fed210">7fed210</a>`,
    );
  });

  it("leaves shas as plain text without a repository", () => {
    const text = "Pushed to the PR in d15cba5.";
    expect(render([{ type: "text", text }])).toBe(`<p>${text}</p>`);
    expect(render([{ type: "text", text }], { repositoryUrl: null })).toBe(
      `<p>${text}</p>`,
    );
  });

  it("keeps the marks of the text it splits", () => {
    expect(
      render(
        [{ type: "text", text: "see d15cba5", marks: [{ type: "bold" }] }],
        {
          repositoryUrl: REPOSITORY_URL,
        },
      ),
    ).toBe(
      "<p><strong>see </strong>" +
        '<a target="_blank" rel="noopener noreferrer nofollow" ' +
        `href="${REPOSITORY_URL}/commit/d15cba5"><strong>d15cba5</strong></a></p>`,
    );
  });

  it("leaves a sha written as code alone", () => {
    expect(
      render([{ type: "text", text: "d15cba5", marks: [{ type: "code" }] }], {
        repositoryUrl: REPOSITORY_URL,
      }),
    ).toBe("<p><code>d15cba5</code></p>");
  });

  it("leaves a code block alone", () => {
    expect(
      renderCommentHtml(
        {
          type: "doc",
          content: [
            {
              type: "codeBlock",
              content: [{ type: "text", text: "git show d15cba5" }],
            },
          ],
        },
        { mentionLabels: new Map(), repositoryUrl: REPOSITORY_URL },
      ),
    ).toBe("<pre><code>git show d15cba5</code></pre>");
  });

  it("leaves an existing link alone", () => {
    expect(
      render(
        [
          {
            type: "text",
            text: "d15cba5",
            marks: [{ type: "link", attrs: { href: "https://argos-ci.com" } }],
          },
        ],
        { repositoryUrl: REPOSITORY_URL },
      ),
    ).toContain('href="https://argos-ci.com"');
  });
});
