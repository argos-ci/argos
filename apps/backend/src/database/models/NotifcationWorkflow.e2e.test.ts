import { describe, it } from "vitest";

import { NotificationWorkflow } from "./NotificationWorkflow.js";

describe("NotificationWorkflow", () => {
  it("inserts and update with correct data", async () => {
    const workflow = await NotificationWorkflow.query().insertAndFetch({
      jobStatus: "pending",
      type: "welcome",
      data: {},
    });

    await workflow.$query().patch({
      jobStatus: "pending",
    });
  });
});
