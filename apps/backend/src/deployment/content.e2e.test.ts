import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import { registerDeploymentContent } from "./content";

describe("registerDeploymentContent", () => {
  it("refuses content that was never uploaded nor registered", async () => {
    await expect(
      registerDeploymentContent([
        {
          content_hash: randomBytes(32).toString("hex"),
          content_type: "text/html",
        },
      ]),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
