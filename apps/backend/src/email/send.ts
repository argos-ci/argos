import { WelcomeEmail } from "./welcome.js";
import { Resend } from "resend";
import config from "@/config/index.js";

const production = config.get("env") === "production";
const resendApiKey = config.get("resend.apiKey");

// Resend throws if API key is missing
// It is tolerable in test and development but not in production
const resend =
  resendApiKey || production ? new Resend(config.get("resend.apiKey")) : null;

const from = "Argos <contact@argos-ci.com>";

export async function sendWelcomeEmail({ to }: { to: string }) {
  await resend?.emails.send({
    from,
    to: [to],
    subject: "Welcome to Argos!",
    react: WelcomeEmail({ baseUrl: config.get("server.url") }),
  });
}
