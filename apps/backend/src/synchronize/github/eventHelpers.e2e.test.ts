import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { ORGANIZATION_PURCHASE_EVENT_PAYLOAD } from "../fixtures/purchase-event-payload";
import { getAccount, getOrCreateAccountFromEvent } from "./eventHelpers";

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

  it("links the organization to a team the buyer already owns", async () => {
    const { sender, marketplace_purchase } =
      ORGANIZATION_PURCHASE_EVENT_PAYLOAD;
    const buyer = await factory.UserAccount.create({
      githubAccountId: (
        await factory.GithubAccount.create({
          githubId: sender.id,
          login: sender.login,
          type: "user",
        })
      ).id,
    });
    const team = await factory.TeamAccount.create({ githubAccountId: null });
    invariant(team.teamId && buyer.userId, "team and user expected");
    await factory.TeamUser.create({
      teamId: team.teamId,
      userId: buyer.userId,
      userLevel: "owner",
    });
    const repository = await factory.GithubRepository.create({
      githubAccountId: (
        await factory.GithubAccount.create({
          githubId: marketplace_purchase.account.id,
          login: marketplace_purchase.account.login,
          type: "organization",
        })
      ).id,
    });
    await factory.Project.create({
      accountId: team.id,
      githubRepositoryId: repository.id,
    });

    const account = await getOrCreateAccountFromEvent(
      ORGANIZATION_PURCHASE_EVENT_PAYLOAD,
    );
    expect(account.id).toBe(team.id);

    // How `changed` and `cancelled` events find the team.
    const found = await getAccount(ORGANIZATION_PURCHASE_EVENT_PAYLOAD);
    expect(found?.id).toBe(team.id);
  });
});
