import { describe, expect, it } from "vitest";

import { getRectInImage } from "./imageAnchor";

describe("getRectInImage", () => {
  it.each([
    {
      name: "spans the two corners",
      a: { x: 0.2, y: 0.3 },
      b: { x: 0.6, y: 0.5 },
      expected: { x: 0.2, y: 0.3, width: 0.4, height: 0.2 },
    },
    {
      name: "accepts corners in any order",
      a: { x: 0.6, y: 0.5 },
      b: { x: 0.2, y: 0.3 },
      expected: { x: 0.2, y: 0.3, width: 0.4, height: 0.2 },
    },
    {
      name: "cuts a drag that leaves the image",
      a: { x: 0.5, y: 0.5 },
      b: { x: 1.4, y: -0.2 },
      expected: { x: 0.5, y: 0, width: 0.5, height: 0.5 },
    },
    {
      name: "drops a drag made entirely beside the image",
      a: { x: -0.4, y: 0.2 },
      b: { x: -0.1, y: 0.6 },
      expected: null,
    },
    {
      name: "drops a flat drag",
      a: { x: 0.2, y: 0.4 },
      b: { x: 0.7, y: 0.4 },
      expected: null,
    },
  ])("$name", ({ a, b, expected }) => {
    const rect = getRectInImage(a, b);
    if (expected === null) {
      expect(rect).toBeNull();
      return;
    }
    expect(rect).not.toBeNull();
    expect(rect?.x).toBeCloseTo(expected.x);
    expect(rect?.y).toBeCloseTo(expected.y);
    expect(rect?.width).toBeCloseTo(expected.width);
    expect(rect?.height).toBeCloseTo(expected.height);
  });
});
