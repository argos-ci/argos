import { invariant } from "@argos/util/invariant";
import { expect, test } from "vitest";

import { knex } from "@/database/knex";
import {
  Account,
  DiscordWebhook,
  MsTeamsWebhook,
  SlackInstallation,
  Team,
  TeamInvite,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { decrypt } from "./encrypt";

async function readStored(
  table: string,
  where: Record<string, string>,
  column: string,
) {
  const row = await knex(table).where(where).first(column);
  invariant(row, `${table} row not found`);
  const value: unknown = row[column];
  invariant(typeof value === "string", `${table}.${column} is not a string`);
  return value;
}

test("integration and invite secrets are stored encrypted", async () => {
  await setupDatabase();
  const team = await factory.Team.create({
    inviteSecret: "team-invite-secret-1",
  });
  const [account, user, slack] = await Promise.all([
    factory.TeamAccount.create({
      teamId: team.id,
      gitlabAccessToken: "glpat-secret",
    }),
    factory.User.create(),
    factory.SlackInstallation.create(),
  ]);
  const [discord, msTeams] = await Promise.all([
    factory.DiscordWebhook.create({ accountId: account.id }),
    factory.MsTeamsWebhook.create({ accountId: account.id }),
    TeamInvite.query().insert({
      teamId: team.id,
      email: "jane@acme.com",
      secret: "abcdefghij1234567890",
      userLevel: "member",
      invitedById: user.id,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    }),
  ]);

  const cases = [
    {
      table: "accounts",
      where: { id: account.id },
      column: "gitlabAccessToken",
      clear: "glpat-secret",
      read: async () =>
        (await Account.query().findById(account.id))?.gitlabAccessToken,
    },
    {
      table: "slack_installations",
      where: { id: slack.id },
      column: "installation",
      clear: JSON.stringify(slack.installation),
      read: async () =>
        JSON.stringify(
          (await SlackInstallation.query().findById(slack.id))?.installation,
        ),
    },
    {
      table: "discord_webhooks",
      where: { id: discord.id },
      column: "url",
      clear: discord.url,
      read: async () =>
        (await DiscordWebhook.query().findById(discord.id))?.url,
    },
    {
      table: "ms_teams_webhooks",
      where: { id: msTeams.id },
      column: "url",
      clear: msTeams.url,
      read: async () =>
        (await MsTeamsWebhook.query().findById(msTeams.id))?.url,
    },
    {
      table: "teams",
      where: { id: team.id },
      column: "inviteSecret",
      clear: "team-invite-secret-1",
      read: async () => (await Team.query().findById(team.id))?.inviteSecret,
    },
    {
      table: "team_invites",
      where: { teamId: team.id, email: "jane@acme.com" },
      column: "secret",
      clear: "abcdefghij1234567890",
      read: async () =>
        (
          await TeamInvite.query()
            .where({ teamId: team.id, email: "jane@acme.com" })
            .first()
        )?.secret,
    },
  ];

  for (const { table, where, column, clear, read } of cases) {
    const stored = await readStored(table, where, column);
    expect(stored, `${table}.${column}`).not.toContain(clear);
    expect(decrypt(stored), `${table}.${column}`).toBe(clear);
    expect(await read(), `${table}.${column}`).toBe(clear);
  }
});
