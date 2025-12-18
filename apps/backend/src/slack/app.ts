import type { IncomingMessage, ServerResponse } from "node:http";
import { invariant } from "@argos/util/invariant";
import * as Bolt from "@slack/bolt";
import Cookies from "cookies";
import { PartialModelObject } from "objection";

import config from "@/config";
import { Account, SlackInstallation } from "@/database/models";
import { transaction } from "@/database/transaction";

import { deleteInstallation, slackInstallationQuery } from "./helpers";

/**
 * Set the accountId in the cookies.
 */
function setAccountIdInCookies(
  req: IncomingMessage,
  res: ServerResponse,
  accountId: string,
) {
  const cookies = new Cookies(req, res, {
    secure: true,
    keys: [config.get("slack.stateSecret")],
  });
  cookies.set("slack_accountId", accountId, { signed: true });
}

/**
 * Get the accountId from the cookies.
 */
function getAccountIdFromCookies(req: IncomingMessage, res: ServerResponse) {
  const cookies = new Cookies(req, res, {
    secure: true,
    keys: [config.get("slack.stateSecret")],
  });
  return cookies.get("slack_accountId", { signed: true });
}

/**
 * Store account id in the installation metadata.
 */
function setAccountIdOnSlackInstallation(
  installation: { metadata?: string },
  accountId: string,
) {
  installation.metadata = JSON.stringify({ accountId });
}

/**
 * Get the account id from the installation metadata.
 */
function getAccountIdFromSlackInstallation(installation: {
  metadata?: string;
}): string | null {
  if (!installation.metadata) {
    return null;
  }
  const metadata = JSON.parse(installation.metadata);
  return metadata.accountId;
}

const installationStore: Bolt.InstallationStore = {
  storeInstallation: async (installation) => {
    const accountId = getAccountIdFromSlackInstallation(installation);
    invariant(accountId, "Expected accountId to be defined in metadata");

    const data: PartialModelObject<SlackInstallation> = await (async () => {
      if (
        installation.isEnterpriseInstall &&
        installation.enterprise !== undefined
      ) {
        throw new Error("Enterprise installations are not supported");
      }
      if (installation.team !== undefined) {
        const token = installation.bot?.token;
        invariant(token, "Expected bot token to be defined");
        const teamInfo = await boltApp.client.team.info({
          team: installation.team.id,
          token,
        });
        invariant(
          teamInfo.team,
          `Failed fetching team info (error: ${teamInfo.error ?? "Unknown"})`,
        );
        const teamDomain = teamInfo.team.domain;
        invariant(teamDomain, "Expected team domain to be defined");
        const teamName = teamInfo.team.name || teamDomain;
        return {
          teamId: installation.team.id,
          teamDomain,
          teamName,
          installation,
        };
      }
      throw new Error("Failed saving installation data to installationStore");
    })();

    const boltInstallQuery: Bolt.InstallationQuery<boolean> = {
      isEnterpriseInstall: Boolean(installation.isEnterpriseInstall),
      enterpriseId: installation.enterprise?.id,
      teamId: installation.team?.id,
    };

    await transaction(async (trx) => {
      const existingSlackInstallation = await slackInstallationQuery(
        boltInstallQuery,
        trx,
      );

      const modelData = {
        ...data,
        connectedAt: new Date().toISOString(),
      };

      if (existingSlackInstallation) {
        // If the installation already exists, we update it
        await existingSlackInstallation.$query(trx).patch(modelData);
        return;
      }

      // Else we create a new installation
      const slackInstallation = await SlackInstallation.query(trx)
        .insert(modelData)
        .returning("id");
      await Account.query(trx)
        .findById(accountId)
        .patch({ slackInstallationId: slackInstallation.id });
    });
  },
  fetchInstallation: async (installQuery) => {
    const slackInstallation =
      await slackInstallationQuery(installQuery).throwIfNotFound();
    return slackInstallation.installation;
  },
  deleteInstallation: async (installQuery) => {
    await deleteInstallation(installQuery);
  },
};

export const SLACK_BOT_SCOPES = [
  "links:read",
  "links:write",
  "team:read",
  "channels:read",
  "groups:read",
  "chat:write",
  "chat:write.public",
];

const ExpressReceiver = (Bolt.ExpressReceiver ||
  (Bolt.default as any).ExpressReceiver) as typeof Bolt.ExpressReceiver;

export const receiver = new ExpressReceiver({
  signingSecret: config.get("slack.signingSecret"),
  clientId: config.get("slack.clientId"),
  clientSecret: config.get("slack.clientSecret"),
  stateSecret: config.get("slack.stateSecret"),
  scopes: SLACK_BOT_SCOPES,
  installationStore,
  redirectUri: config.get("server.url") + "/auth/slack/oauth_redirect",
  installerOptions: {
    directInstall: true,
    installPath: "/auth/slack/login",
    installPathOptions: {
      beforeRedirection: async (req, res) => {
        invariant(req.url, "Expected req.url to be defined");
        const url = new URL(req.url, config.get("server.url"));
        const accountId = url.searchParams.get("accountId");
        invariant(accountId, 'Expected "accountId" to be defined');

        setAccountIdInCookies(req, res, accountId);

        return true;
      },
    },
    callbackOptions: {
      afterInstallation: async (installation, _options, req, res) => {
        const accountId = getAccountIdFromCookies(req, res);
        invariant(accountId, "Expected accountId to be defined");
        setAccountIdOnSlackInstallation(installation, accountId);
        return true;
      },
      success: async (_installation, _options, req, res) => {
        const accountId = getAccountIdFromCookies(req, res);
        invariant(accountId, "Expected accountId to be defined");
        const account = await Account.query()
          .findById(accountId)
          .throwIfNotFound();
        res.writeHead(302, {
          Location: `/${account.slug}/settings/integrations#slack`,
        });
        res.end();
      },
    },
    redirectUriPath: "/auth/slack/oauth_redirect",
  },
});

export const boltApp = new Bolt.App({ receiver });
