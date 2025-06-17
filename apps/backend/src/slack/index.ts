import type { IncomingMessage, ServerResponse } from "node:http";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import Bolt from "@slack/bolt";
import Cookies from "cookies";
import { Router } from "express";
import { PartialModelObject, TransactionOrKnex } from "objection";
import { match } from "path-to-regexp";
import { z } from "zod";

import { getBuildLabel } from "@/build/label.js";
import { getStatsMessage } from "@/build/stats.js";
import config from "@/config/index.js";
import { transaction } from "@/database";
import {
  Account,
  Build,
  ScreenshotDiff,
  SlackInstallation,
} from "@/database/models";
import { getPublicImageFileUrl, getTwicPicsUrl } from "@/storage";

export type SlackMessageBlock = Bolt.types.AnyBlock;

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

/**
 * Fetch the Slack installation model.
 */
function slackInstallationQuery(
  installationQuery: Bolt.InstallationQuery<boolean>,
  trx?: TransactionOrKnex,
) {
  if (installationQuery.teamId !== undefined) {
    return SlackInstallation.query(trx)
      .where("teamId", installationQuery.teamId)
      .first();
  }
  throw new Error("Failed fetching installation");
}

/**
 * Fetch the Slack installation model.
 */
async function deleteInstallation(
  installationQuery: Bolt.InstallationQuery<boolean>,
  trx?: TransactionOrKnex,
) {
  const slackInstallation = await slackInstallationQuery(
    installationQuery,
    trx,
  ).withGraphFetched("account");
  if (!slackInstallation) {
    return;
  }
  await transaction(trx, async (trx) => {
    if (slackInstallation.account) {
      await Account.query(trx)
        .findById(slackInstallation.account.id)
        .patch({ slackInstallationId: null });
    }
    await slackInstallation.$query(trx).delete();
  });
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
  "chat:write",
  "chat:write.public",
];

const receiver = new Bolt.ExpressReceiver({
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
          Location: `/${account.slug}/settings#slack`,
        });
        res.end();
      },
    },
    redirectUriPath: "/auth/slack/oauth_redirect",
  },
});

const boltApp = new Bolt.App({ receiver });

type BuildMatchParams = {
  accountSlug: string;
  projectName: string;
  buildNumber: string;
  diffId?: string;
};
const matchBuildPath = match<BuildMatchParams>(
  "/:accountSlug/:projectName/builds/:buildNumber{/:diffId}",
);

async function unfurlBuild(
  params: BuildMatchParams,
  auth: { accountId: string },
): Promise<Bolt.types.MessageAttachment | null> {
  const build = await Build.query()
    .withGraphJoined("project.account")
    .where("project.name", params.projectName)
    .where("builds.number", params.buildNumber)
    .where("project:account.id", auth.accountId)
    .where("project:account.slug", params.accountSlug)
    .first();

  if (!build) {
    return null;
  }

  const statsMessage = build.stats ? getStatsMessage(build.stats) : null;

  const [[status], screenshotDiff] = await Promise.all([
    Build.getAggregatedBuildStatuses([build]),
    params.diffId
      ? ScreenshotDiff.query()
          .findById(params.diffId)
          .where("buildId", build.id)
          .withGraphFetched("[baseScreenshot.file, compareScreenshot.file]")
      : null,
  ]);
  invariant(status, "Status should be loaded");
  invariant(build.project, "Project should be loaded");
  invariant(build.project.account, "Account should be loaded");

  const screenshot =
    screenshotDiff?.compareScreenshot || screenshotDiff?.baseScreenshot;
  const imageUrl = await (() => {
    if (!screenshot) {
      return null;
    }
    if (!screenshot.file) {
      return getTwicPicsUrl(screenshot.s3Id);
    }
    return getPublicImageFileUrl(screenshot.file);
  })();

  const attachment: Bolt.types.MessageAttachment = {
    title: `Build ${build.number} — ${build.name} — ${build.project.account.name || build.project.account.slug}/${build.project.name}`,
    fields: [
      { title: "Status", value: getBuildLabel(build.type, status) },
      statsMessage ? { title: "Screenshots", value: statsMessage } : null,
    ].filter(checkIsNonNullable),
  };

  if (imageUrl) {
    attachment.image_url = imageUrl;
  }

  return attachment;
}

boltApp.event("app_uninstalled", async ({ context }) => {
  await deleteInstallation({
    isEnterpriseInstall: context.isEnterpriseInstall,
    enterpriseId: context.enterpriseId,
    teamId: context.teamId,
  });
});

boltApp.event("team_rename", async ({ event, context }) => {
  const slackInstallation = await slackInstallationQuery({
    isEnterpriseInstall: context.isEnterpriseInstall,
    enterpriseId: context.enterpriseId,
    teamId: context.teamId,
  }).throwIfNotFound();

  await slackInstallation
    .$query()
    .patch({ teamName: event.name || slackInstallation.teamDomain });
});

boltApp.event("team_domain_change", async ({ event, context }) => {
  const slackInstallation = await slackInstallationQuery({
    isEnterpriseInstall: context.isEnterpriseInstall,
    enterpriseId: context.enterpriseId,
    teamId: context.teamId,
  }).throwIfNotFound();

  const teamDomain =
    "domain" in event && typeof event.domain === "string" ? event.domain : null;
  invariant(teamDomain, "Expected domain to be defined");

  await slackInstallation.$query().patch({ teamDomain });
});

boltApp.event("link_shared", async ({ event, client, context }) => {
  const slackInstallation = await slackInstallationQuery({
    isEnterpriseInstall: context.isEnterpriseInstall,
    enterpriseId: context.enterpriseId,
    teamId: context.teamId,
  })
    .withGraphFetched("account")
    .throwIfNotFound();

  if (!slackInstallation.account) {
    return;
  }

  const auth = { accountId: slackInstallation.account.id };

  const knownUrls = await Promise.all(
    event.links.map<Promise<[string, Bolt.types.MessageAttachment] | null>>(
      async (link) => {
        const urlObj = new URL(link.url);
        if (urlObj.origin !== config.get("server.url")) {
          return null;
        }
        const match = matchBuildPath(urlObj.pathname);
        if (match) {
          const buildInfo = await unfurlBuild(match.params, auth);
          if (!buildInfo) {
            return null;
          }
          return [link.url, buildInfo];
        }
        return null;
      },
    ),
  );

  const unfurls: Bolt.types.LinkUnfurls = Object.fromEntries(
    knownUrls.filter(checkIsNonNullable),
  );

  await client.chat.unfurl({
    channel: event.channel,
    ts: event.message_ts,
    unfurls,
  });
});

/**
 * Uninstall the Slack installation.
 */
export async function uninstallSlackInstallation(
  installation: SlackInstallation,
  trx?: TransactionOrKnex,
): Promise<void> {
  const token = installation.installation.bot?.token;
  invariant(token, "Expected bot token to be defined");
  await Promise.all([
    // Uninstall the app from the workspace on Slack
    boltApp.client.apps.uninstall({
      token,
      client_id: config.get("slack.clientId"),
      client_secret: config.get("slack.clientSecret"),
    }),
    // Delete the installation from the database
    deleteInstallation(
      {
        isEnterpriseInstall: Boolean(
          installation.installation.isEnterpriseInstall,
        ),
        enterpriseId: installation.installation.enterprise?.id,
        teamId: installation.installation.team?.id,
      },
      trx,
    ),
  ]);
}

/**
 * Post a message to a Slack channel.
 */
export async function postMessageToSlackChannel(args: {
  installation: SlackInstallation;
  channel: string;
  text: string;
  blocks?: SlackMessageBlock[];
}) {
  const { installation, channel, text, blocks } = args;
  const token = installation.installation.bot?.token;
  invariant(token, "Expected bot token to be defined");
  await boltApp.client.chat.postMessage({
    token,
    channel,
    text,
    blocks,
    unfurl_links: false,
    unfurl_media: false,
  });
}

const SlackChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type SlackChannel = z.infer<typeof SlackChannelSchema>;

/**
 * Get a Slack channel by its name.
 */
export async function getSlackChannelByName(args: {
  installation: SlackInstallation;
  name: string;
}): Promise<SlackChannel | null> {
  const { installation, name } = args;
  const token = installation.installation.bot?.token;
  invariant(token, "Expected bot token to be defined");
  return findChannelByName({ token, name });
}

/**
 * Get a Slack channel by its ID.
 */
export async function getSlackChannelById(args: {
  installation: SlackInstallation;
  id: string;
}): Promise<SlackChannel | null> {
  const { installation, id } = args;
  const token = installation.installation.bot?.token;
  invariant(token, "Expected bot token to be defined");
  const res = await boltApp.client.conversations.info({
    token,
    channel: id,
  });
  if (!res) {
    return null;
  }
  return SlackChannelSchema.parse(res.channel);
}

/**
 * Find a Slack channel by its name recursively in all pages of the channel list.
 */
async function findChannelByName(args: {
  token: string;
  name: string;
}): Promise<SlackChannel | null> {
  const { token } = args;
  const name = normalizeChannelName(args.name);
  let cursor;
  do {
    const res = await boltApp.client.conversations.list(
      cursor ? { token, cursor } : { token },
    );
    const match = res.channels?.find(
      (c) => c.name === normalizeChannelName(name),
    );
    if (match) {
      return SlackChannelSchema.parse(match);
    }
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);
  return null;
}

/**
 * Normalize a Slack channel name by removing the leading `#` and converting to lowercase.
 */
export function normalizeChannelName(channelName: string): string {
  return channelName.replace(/^#/, "").toLowerCase();
}

export const slackMiddleware: Router = receiver.router;
