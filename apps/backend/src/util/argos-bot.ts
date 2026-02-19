import { User } from "@/database/models";

const ARGOS_BOT_EMAIL = "argos-bot@no-reply.argos-ci.com";

export async function getArgosBotUserId() {
  const bot = await User.query()
    .select("id")
    .findOne({ email: ARGOS_BOT_EMAIL })
    .throwIfNotFound();

  return bot.id;
}
