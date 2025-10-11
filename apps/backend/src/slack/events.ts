import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import type * as Bolt from "@slack/bolt";

import config from "@/config/index.js";
import { SlackChannel } from "@/database/models";

import { deleteInstallation, slackInstallationQuery } from "./helpers";
import { notifySlackChannelAction } from "./notify";
import { matchBuildPath, unfurlBuild } from "./unfurl";

export function registerEvents(boltApp: Bolt.App) {
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

  boltApp.event("channel_rename", async ({ event }) => {
    await SlackChannel.query().findOne({ slackId: event.channel.id }).patch({
      name: event.channel.name,
    });
  });

  boltApp.event("channel_id_changed", async ({ event }) => {
    await SlackChannel.query()
      .findOne({ slackId: event.old_channel_id })
      .patch({
        slackId: event.new_channel_id,
      });
  });

  boltApp.event("channel_archive", async ({ event }) => {
    const channel = await SlackChannel.query().findOne({
      slackId: event.channel,
    });

    if (channel) {
      await channel.$clone().$query().patch({ archived: true });
      await notifySlackChannelAction(channel, "archived");
    }
  });

  boltApp.event("channel_unarchive", async ({ event }) => {
    await SlackChannel.query().findOne({ slackId: event.channel }).patch({
      archived: false,
    });
  });

  boltApp.event("channel_deleted", async ({ event }) => {
    const channel = await SlackChannel.query().findOne({
      slackId: event.channel,
    });

    if (channel) {
      await channel.$clone().$query().delete();
      await notifySlackChannelAction(channel, "deleted");
    }
  });

  boltApp.event("team_domain_change", async ({ event, context }) => {
    const slackInstallation = await slackInstallationQuery({
      isEnterpriseInstall: context.isEnterpriseInstall,
      enterpriseId: context.enterpriseId,
      teamId: context.teamId,
    }).throwIfNotFound();

    const teamDomain =
      "domain" in event && typeof event.domain === "string"
        ? event.domain
        : null;
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
}
