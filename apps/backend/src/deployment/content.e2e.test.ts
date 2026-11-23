import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import { assertContentUploaded } from "./content";

describe("assertContentUploaded", () => {
  it("refuses content that was never uploaded nor registered", async () => {
    await expect(
      assertContentUploaded([randomBytes(32).toString("hex")]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
