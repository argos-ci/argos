import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";

import config from "@/config";

import { signUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe";

describe("unsubscribe token", () => {
  const payload = {
    userId: "user-1",
    category: "review" as const,
    channel: "email" as const,
  };

  it("round-trips a valid token", () => {
    const token = signUnsubscribeToken(payload);
    expect(verifyUnsubscribeToken(token)).toEqual(payload);
  });

  it("rejects a tampered token", () => {
    const token = signUnsubscribeToken(payload);
    expect(verifyUnsubscribeToken(`${token}tampered`)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = jwt.sign(
      { type: "notification_unsubscribe", ...payload },
      "not-the-real-secret",
      { algorithm: "HS256" },
    );
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it("rejects a token with the wrong type", () => {
    const token = jwt.sign(payload, config.get("session.secret"), {
      algorithm: "HS256",
    });
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });

  it("rejects a non-configurable category", () => {
    const token = jwt.sign(
      { type: "notification_unsubscribe", ...payload, category: "account" },
      config.get("session.secret"),
      { algorithm: "HS256" },
    );
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });
});
