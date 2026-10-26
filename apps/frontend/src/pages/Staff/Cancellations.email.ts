import {
  SubscriptionCancellationReason,
  SubscriptionCancelReason,
} from "@/gql/graphql";

import { getGreeting, type Owner } from "./Trials.email";

/**
 * The question to ask, given what the team answered on its way out.
 *
 * Each one asks for the one thing the answer leaves open: which feature, which
 * tool, where it got stuck. A generic "why did you leave?" to a team that
 * already said why reads as if nobody looked.
 */
const FEEDBACK_QUESTIONS: Record<SubscriptionCancelReason, string> = {
  [SubscriptionCancelReason.TooExpensive]:
    "You mentioned that Argos cost too much. I'd be happy to look for a plan that fits your usage better. Would you be open to a quick call?",
  [SubscriptionCancelReason.MissingFeatures]:
    "You mentioned that a feature was missing. Which one did you need? It would help us decide what to build next.",
  [SubscriptionCancelReason.SwitchedService]:
    "You mentioned that you moved to another tool. Would you mind telling me which one, and what made the difference?",
  [SubscriptionCancelReason.Unused]:
    "You mentioned that you were not using Argos enough. Was something getting in the way of making it part of your workflow?",
  [SubscriptionCancelReason.TooComplex]:
    "You mentioned that Argos was hard to set up or to use. Where did you get stuck? I'd be happy to help if you want to give it another try.",
  [SubscriptionCancelReason.LowQuality]:
    "You mentioned that Argos did not work well enough for you. Could you tell me what went wrong? I'd like to get it fixed.",
  [SubscriptionCancelReason.CustomerService]:
    "You mentioned that our support was not good enough. I'm sorry about that, and I'd like to understand what happened.",
  [SubscriptionCancelReason.Other]:
    "Thank you for taking the time to tell us why. Is there anything we could have done to keep you?",
};

/**
 * The offer that replaces the question, for the answers a lower price can
 * change. No figure: the discount is negotiated case by case, and this code is
 * public, so it would also tell every subscriber what canceling gets them.
 */
const DISCOUNT_OFFERS: Partial<Record<SubscriptionCancelReason, string>> = {
  [SubscriptionCancelReason.TooExpensive]:
    "You mentioned that Argos cost too much. If it helps, I can offer you a significant discount on the Pro plan for a year. Would that work for you?",
  [SubscriptionCancelReason.Unused]:
    "You mentioned that you were not using Argos enough. If cost is part of it, I can offer you a significant discount on the Pro plan for a year. Would that help?",
};

const NO_ANSWER_QUESTION =
  "I'd love to understand what made you leave. Was something missing, or did your needs change?";

function formatEndDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The email to a team that canceled, drafted from what the page knows.
 *
 * A subscription Stripe ended after its payments failed was not a decision,
 * so that email asks nothing and only says how to come back. Otherwise the
 * email opens on where the team stands, asks the question its survey answer
 * leaves open, and, while the subscription still runs, says it can be resumed:
 * that is the cheapest way back, and it closes on the end date. Only Stripe
 * subscriptions resume from Argos; a GitHub one is managed on GitHub.
 *
 * A team the discount is for, whose answer is about price, gets the offer
 * instead of the question, and no word about resuming: resumed from the
 * billing page, the subscription would carry on at full price.
 */
export function getCancellationEmail(input: {
  owners: Owner[];
  reason: SubscriptionCancellationReason | null;
  feedback: SubscriptionCancelReason | null;
  /** When the subscription stops, if that is still ahead. */
  runsUntil: Date | null;
  /** Whether the team can call the cancellation off from its billing page. */
  resumable: boolean;
  /** Canceled before its trial converted: it never billed a cycle. */
  wasTrial: boolean;
  /** Whether the team is one the retention discount can be offered to. */
  discountable: boolean;
}): { subject: string; body: string } {
  const greeting = getGreeting(input.owners);

  if (input.reason === SubscriptionCancellationReason.PaymentFailed) {
    return {
      subject: "Your Argos subscription",
      body: [
        greeting,
        "",
        "I noticed that your Argos subscription ended because the last payment did not go through.",
        "",
        "If that was not intended, you can subscribe again anytime from your team's billing settings, and I'd be happy to help if anything gets in the way.",
        "",
        "Have a great day,",
      ].join("\n"),
    };
  }

  const opener = [
    `I saw that you canceled your Argos ${input.wasTrial ? "trial" : "subscription"}.`,
    input.runsUntil
      ? `It stays active until ${formatEndDate(input.runsUntil)}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
  const offer =
    input.discountable && input.feedback
      ? DISCOUNT_OFFERS[input.feedback]
      : undefined;

  return {
    subject: "Quick feedback on Argos",
    body: [
      greeting,
      "",
      opener,
      "",
      offer ??
        (input.feedback
          ? FEEDBACK_QUESTIONS[input.feedback]
          : NO_ANSWER_QUESTION),
      ...(input.runsUntil && input.resumable && !offer
        ? [
            "",
            "If you change your mind before then, you can resume it in one click from your team's billing settings.",
          ]
        : []),
      "",
      "Have a great day,",
    ].join("\n"),
  };
}
