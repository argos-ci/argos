export const setup = () => {
  process.env.TZ = "UTC";
  // Never send real Discord notifications from tests. Set before the config
  // module loads .env: dotenv does not override an already-defined key, so an
  // empty value here keeps the webhook client disabled in every worker.
  process.env.DISCORD_WEBHOOK_URL = "";
};
