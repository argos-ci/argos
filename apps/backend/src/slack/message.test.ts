import { describe, expect, it } from "vitest";

import { escapeSlackText } from "./message";

describe("#escapeSlackText", () => {
  it("escapes ampersands", () => {
    expect(escapeSlackText("A & B")).toBe("A &amp; B");
  });

  it("escapes less-than signs", () => {
    expect(escapeSlackText("A < B")).toBe("A &lt; B");
  });

  it("escapes greater-than signs", () => {
    expect(escapeSlackText("A > B")).toBe("A &gt; B");
  });

  it("escapes multiple special characters", () => {
    expect(escapeSlackText("A & B < C > D")).toBe("A &amp; B &lt; C &gt; D");
  });

  it("returns unchanged string with no special characters", () => {
    expect(escapeSlackText("Hello World")).toBe("Hello World");
  });

  it("handles empty string", () => {
    expect(escapeSlackText("")).toBe("");
  });

  it("escapes pipe characters", () => {
    expect(escapeSlackText("A | B")).toBe("A &pipe; B");
  });

  it("escapes multiple special characters including pipe", () => {
    expect(escapeSlackText("A & B < C > D | E")).toBe(
      "A &amp; B &lt; C &gt; D &pipe; E",
    );
  });

  it("handles string with only special characters", () => {
    expect(escapeSlackText("& < > |")).toBe("&amp; &lt; &gt; &pipe;");
  });
});
