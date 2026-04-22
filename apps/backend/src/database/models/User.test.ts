import { describe, expect, it } from "vitest";

import { User } from "./User";

describe("getNotificationEmailAddress", () => {
  it("returns the primary user email when present", () => {
    expect(
      User.getNotificationEmailAddress({
        email: "primary@example.com",
        emails: [{ email: "verified@example.com", verified: true }],
      }),
    ).toBe("primary@example.com");
  });

  it("falls back to the first verified user email", () => {
    expect(
      User.getNotificationEmailAddress({
        email: null,
        emails: [
          { email: "pending@example.com", verified: false },
          { email: "verified@example.com", verified: true },
        ],
      }),
    ).toBe("verified@example.com");
  });

  it("returns null when no notification email is available", () => {
    expect(
      User.getNotificationEmailAddress({
        email: null,
        emails: [{ email: "pending@example.com", verified: false }],
      }),
    ).toBeNull();
  });
});
