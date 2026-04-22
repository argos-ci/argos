import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { handler } from "./spend_limit";

describe("spend_limit notification", () => {
  it("mentions that builds will be paused at 100% when automatic pause is enabled", async () => {
    const email = handler.email({
      accountName: "Argos",
      accountSlug: "argos",
      blockWhenSpendLimitIsReached: true,
      ctx: { user: { name: "Jane" } },
      threshold: 75,
    });

    const html = await render(email.body);

    expect(html).toContain("all builds will be paused");
    expect(html).toContain("100%");
  });

  it("mentions that builds will continue above 100% when automatic pause is disabled", async () => {
    const email = handler.email({
      accountName: "Argos",
      accountSlug: "argos",
      blockWhenSpendLimitIsReached: false,
      ctx: { user: { name: "Jane" } },
      threshold: 75,
    });

    const html = await render(email.body);

    expect(html).toContain("builds will continue");
    expect(html).toContain("goes above");
  });
});
