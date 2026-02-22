import cron from "node-cron";

import logger from "@/logger";
import { redisLock } from "@/util/redis";

import { checkExpiringSamlCertificates } from "./saml-certificate-expiration";

const CRON_LOCK_KEY = ["cron", "saml-certificate-expiration"];

export function startSamlCertificateExpirationCron() {
  logger.info("Starting SAML certificate expiration cron");
  const task = cron.schedule("0 * * * *", async () => {
    await redisLock.acquire(
      CRON_LOCK_KEY,
      async () => {
        await checkExpiringSamlCertificates();
      },
      {
        timeout: 55 * 60 * 1000,
      },
    );
  });
  return task;
}
