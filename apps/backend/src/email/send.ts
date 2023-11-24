import { WelcomeEmail } from "./welcome.js";
import { Resend } from "resend";
import config from "@/config/index.js";

const resend = new Resend(config.get("resend.apiKey"));

const from = "Argos <contact@argos-ci.com>";

export async function sendWelcomeEmail({ to }: { to: string }) {
  await resend.emails.send({
    from,
    to: [to],
    subject: "Welcome to Argos!",
    react: WelcomeEmail({ baseUrl: config.get("server.url") }),
  });
}
