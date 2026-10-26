import { describe, expect, it } from "vitest";

import {
  SubscriptionCancellationReason,
  SubscriptionCancelReason,
} from "@/gql/graphql";

import { getCancellationEmail } from "./Cancellations.email";

const owner = { name: "Andre Dupont", email: "andre@example.com" };

const canceled = {
  owners: [owner],
  reason: SubscriptionCancellationReason.CancellationRequested,
  feedback: null,
  runsUntil: null,
  resumable: true,
  wasTrial: false,
};

describe("getCancellationEmail", () => {
  it("greets the owner and asks why when no reason was given", () => {
    const { subject, body } = getCancellationEmail(canceled);
    expect(subject).toBe("Quick feedback on Argos");
    expect(body).toMatch(/^Hi Andre,/);
    expect(body).toContain("canceled your Argos subscription.");
    expect(body).toContain("what made you leave");
  });

  it.each([
    [SubscriptionCancelReason.TooExpensive, "a plan that fits your usage"],
    [SubscriptionCancelReason.MissingFeatures, "Which one did you need?"],
    [SubscriptionCancelReason.SwitchedService, "which one"],
    [SubscriptionCancelReason.Unused, "part of your workflow"],
    [SubscriptionCancelReason.TooComplex, "Where did you get stuck?"],
    [SubscriptionCancelReason.LowQuality, "what went wrong"],
    [SubscriptionCancelReason.CustomerService, "our support"],
    [SubscriptionCancelReason.Other, "anything we could have done"],
  ])("follows up on %s", (feedback, question) => {
    const { body } = getCancellationEmail({ ...canceled, feedback });
    expect(body).toContain(question);
    expect(body).not.toContain("what made you leave");
  });

  it("offers to resume a subscription that still runs", () => {
    const { body } = getCancellationEmail({
      ...canceled,
      runsUntil: new Date("2026-11-12T12:00:00Z"),
    });
    expect(body).toContain("It stays active until November 12, 2026.");
    expect(body).toContain("resume it in one click");
  });

  it("does not offer to resume what cannot be resumed from Argos", () => {
    const { body } = getCancellationEmail({
      ...canceled,
      runsUntil: new Date("2026-11-12T12:00:00Z"),
      resumable: false,
    });
    expect(body).toContain("It stays active until");
    expect(body).not.toContain("resume");
  });

  it("speaks of a trial when the team never paid", () => {
    const { body } = getCancellationEmail({ ...canceled, wasTrial: true });
    expect(body).toContain("canceled your Argos trial.");
  });

  it("asks nothing of a team whose payment failed", () => {
    const { subject, body } = getCancellationEmail({
      ...canceled,
      reason: SubscriptionCancellationReason.PaymentFailed,
      // Answers from an earlier cancellation stay on the subscription; they
      // are not why this one ended.
      feedback: SubscriptionCancelReason.TooExpensive,
    });
    expect(subject).toBe("Your Argos subscription");
    expect(body).toContain("the last payment did not go through");
    expect(body).not.toContain("cost too much");
  });
});
