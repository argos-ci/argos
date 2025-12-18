import { beforeEach, describe, expect, it } from "vitest";

import { setupDatabase } from "@/database/testing";

import { ORGANIZATION_PURCHASE_EVENT_PAYLOAD } from "../fixtures/purchase-event-payload";
import { getOrCreateAccountFromEvent } from "./eventHelpers";

describe("#getOrCreateAccount", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("creates an account", async () => {
    const teamAccount = await getOrCreateAccountFromEvent(
      ORGANIZATION_PURCHASE_EVENT_PAYLOAD,
    );
    await teamAccount.$fetchGraph(
      "[githubAccount,team.[owners.account.githubAccount,users]]",
    );

    // Has one owner that is the sender
    expect(teamAccount.team?.users?.map((user) => user.id)).toEqual(
      teamAccount.team?.owners?.map((user) => user.id),
    );
    expect(teamAccount.team?.owners).toHaveLength(1);
    const user = teamAccount.team?.owners?.[0];
    expect(user?.email).toBe("jeremy@smooth-code.com");

    // User is linked to a GitHub account
    expect(user?.account?.githubAccount?.email).toBe("jeremy@smooth-code.com");

    // Team is linked to a GitHub account
    expect(teamAccount.githubAccount?.email).toBe("contact@smooth-code.com");
  });
});
