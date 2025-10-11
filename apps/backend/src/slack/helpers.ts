import { invariant } from "@argos/util/invariant";
import type * as Bolt from "@slack/bolt";
import { TransactionOrKnex } from "objection";

import config from "@/config";
import { transaction } from "@/database";
import { Account, SlackInstallation } from "@/database/models";

/**
 * Fetch the Slack installation model.
 */
export function slackInstallationQuery(
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
export async function deleteInstallation(
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
    await Promise.all([
      // Unlink account
      (async () => {
        if (slackInstallation.account) {
          await Account.query(trx)
            .findById(slackInstallation.account.id)
            .patch({ slackInstallationId: null });
        }
      })(),
      // Delete channels related to the installation
      slackInstallation.$relatedQuery("channels", trx).delete(),
    ]);
    await slackInstallation.$query(trx).delete();
  });
}

/**
 * Uninstall the Slack installation.
 */
export async function uninstallSlackInstallation(
  boltApp: Bolt.App,
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
