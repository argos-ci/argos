import { describe, expect, it } from "vitest";

import { get20MinutesSlot } from "./date";

describe("get20MinutesSlot", () => {
  it("returns the start of the slot (20 minutes)", () => {
    expect(
      get20MinutesSlot(new Date("2025-06-02T09:26:03.473Z")).toISOString(),
    ).toBe("2025-06-02T09:20:00.000Z");
    expect(
      get20MinutesSlot(new Date("2025-06-02T09:12:03.473Z")).toISOString(),
    ).toBe("2025-06-02T09:00:00.000Z");
    expect(
      get20MinutesSlot(new Date("2025-06-02T09:48:03.473Z")).toISOString(),
    ).toBe("2025-06-02T09:40:00.000Z");
  });
});
