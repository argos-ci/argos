import { expect, test } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { createTeamAccount } from "./team";

test("a new team starts with a $5,000 spend limit that pauses builds", async () => {
  await setupDatabase();
  const owner = await factory.User.create();
  const account = await createTeamAccount({ name: "Acme", ownerId: owner.id });
  expect(account).toMatchObject({
    meteredSpendLimitByPeriod: 5000,
    blockWhenSpendLimitIsReached: true,
  });
});
