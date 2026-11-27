import { BOOK_A_CALL_HREF } from "@/constants";

import { getGreeting, type Owner } from "./Trials.email";

/**
 * The email offering an Enterprise plan to a team its Billing page offers one
 * to. Like the card, it names no amount and no threshold: it reads as an offer,
 * not as a bill. The plan and its commitment are worked out on the call.
 */
export function getEnterpriseOfferEmail(input: {
  owners: Owner[];
  teamName: string;
}): { subject: string; body: string } {
  const { owners, teamName } = input;

  return {
    subject: `A better price for ${teamName} on Argos`,
    body: [
      getGreeting(owners),
      "",
      `I noticed that ${teamName} runs a lot of screenshots on Argos. At this volume, we can offer you a better price than the Pro plan, along with SAML SSO, SCIM and dedicated support.`,
      "",
      `Would you be open to a quick call to find what fits your usage? You can book a time here: ${BOOK_A_CALL_HREF}`,
      "",
      "Nothing changes in the meantime: your builds keep running as usual.",
      "",
      "Have a great day,",
    ].join("\n"),
  };
}

function formatRenewalDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The email opening the renewal of a yearly contract, to send before its term
 * ends: an annual Enterprise plan is renegotiated then. It names no usage and
 * no amount, which are for the call.
 */
export function getRenewalEmail(input: {
  owners: Owner[];
  teamName: string;
  renewsOn: Date;
}): { subject: string; body: string } {
  const { owners, teamName } = input;
  const renewsOn = formatRenewalDate(input.renewsOn);

  return {
    subject: `Your Argos plan renews on ${renewsOn}`,
    body: [
      getGreeting(owners),
      "",
      `The annual Argos plan of ${teamName} renews on ${renewsOn}.`,
      "",
      `Before it does, I'd like to go over with you how your team uses Argos, so the plan we renew fits the year ahead. Would you be open to a quick call? You can book a time here: ${BOOK_A_CALL_HREF}`,
      "",
      "Have a great day,",
    ].join("\n"),
  };
}
