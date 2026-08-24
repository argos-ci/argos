import { invariant } from "@argos/util/invariant";
import { beforeEach, expect, test } from "vitest";

import { GithubAccount } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { getUserAccountFromGithubId } from "./account";

beforeEach(async () => {
  await setupDatabase();
});

async function getGithubId(account: { githubAccountId: string | null }) {
  invariant(account.githubAccountId, "account has no GitHub account");
  const ghAccount = await GithubAccount.query().findById(
    account.githubAccountId,
  );
  invariant(ghAccount, "GitHub account not found");
  return ghAccount.githubId;
}

test("resolves the user account behind a GitHub profile", async () => {
  const userAccount = await factory.UserAccount.create();
  const githubId = await getGithubId(userAccount);

  const result = await getUserAccountFromGithubId({ githubId });

  expect(result.account.id).toBe(userAccount.id);
  expect(result.creation).toBe(false);
});

test("refuses a GitHub profile attached to no account", async () => {
  await expect(
    getUserAccountFromGithubId({ githubId: 404_404_404 }),
  ).rejects.toMatchObject({ statusCode: 403 });
});

// A team carries its GitHub organization on the same column, and logging in as
// one is not a thing — the account this returns is handed straight to
// `completeLogin`, which needs a user.
test("refuses a GitHub organization attached to a team", async () => {
  const teamAccount = await factory.TeamAccount.create();
  const githubId = await getGithubId(teamAccount);

  await expect(getUserAccountFromGithubId({ githubId })).rejects.toMatchObject({
    statusCode: 403,
  });
});
