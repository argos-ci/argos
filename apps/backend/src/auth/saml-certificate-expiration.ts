import { invariant } from "@argos/util/invariant";

import { TeamSamlConfig } from "@/database/models";
import logger from "@/logger";
import { sendNotification } from "@/notification";

import { parseSamlSigningCertificate } from "./saml";

const THRESHOLD_DAYS = [30, 7, 3, 1] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

function getMilestones(expirationDate: Date) {
  return THRESHOLD_DAYS.map((daysBeforeExpiration) => ({
    daysBeforeExpiration,
    checkAt: new Date(expirationDate.getTime() - daysBeforeExpiration * DAY_MS),
  })).sort((a, b) => a.checkAt.getTime() - b.checkAt.getTime());
}

export async function checkExpiringSamlCertificates(now = new Date()) {
  const nowIso = now.toISOString();
  const configs = await TeamSamlConfig.query()
    .whereNotNull("expirationCheckAt")
    .where("expirationCheckAt", "<=", nowIso)
    .withGraphFetched("account");

  for (const config of configs) {
    try {
      invariant(config.account, "TeamSamlConfig account should be fetched");
      invariant(
        config.expirationCheckAt,
        "TeamSamlConfig expirationCheckAt should be set",
      );

      let expirationDate: Date;
      try {
        const { expiresAt } = parseSamlSigningCertificate(
          config.signingCertificate,
        );
        expirationDate = new Date(expiresAt);
      } catch (error) {
        logger.warn(
          { error, teamSamlConfigId: config.id },
          "Invalid SAML signing certificate, disabling expiration checks",
        );
        await config.$query().patch({ expirationCheckAt: null });
        continue;
      }

      const lastCheckAt = new Date(config.expirationCheckAt);
      const milestones = getMilestones(expirationDate);
      const dueMilestones = milestones.filter((milestone) => {
        return milestone.checkAt > lastCheckAt && milestone.checkAt <= now;
      });

      if (dueMilestones.length > 0) {
        const recipients = await config.account.$getOwnerIds();
        for (const milestone of dueMilestones) {
          await sendNotification({
            type: "saml_certificate_expiration",
            data: {
              accountName: config.account.name,
              accountSlug: config.account.slug,
              daysBeforeExpiration: milestone.daysBeforeExpiration,
              expirationDate: expirationDate.toISOString(),
            },
            recipients,
          });
        }
      }

      const nextCheckAt =
        milestones.find((milestone) => milestone.checkAt > now)?.checkAt ??
        null;

      await config.$query().patch({
        expirationCheckAt: nextCheckAt?.toISOString() ?? null,
      });
    } catch (error) {
      logger.error(
        { error, teamSamlConfigId: config.id },
        "Failed to process SAML certificate expiration checks",
      );
    }
  }
}
