import { describe, expect, it } from "vitest";

import { UserAccessToken } from "./UserAccessToken";

describe("models/UserAccessToken", () => {
  describe("generateToken", () => {
    it("generates a valid user access token", () => {
      const token = UserAccessToken.generateToken();

      expect(token).toHaveLength(40);
      expect(token).toMatch(/^arp_[0-9a-f]{36}$/);
      expect(UserAccessToken.isValidUserAccessToken(token)).toBe(true);
    });
  });

  describe("isValidUserAccessToken", () => {
    it("returns true for a generated token", () => {
      expect(
        UserAccessToken.isValidUserAccessToken(UserAccessToken.generateToken()),
      ).toBe(true);
    });

    it("returns false when the prefix is invalid", () => {
      expect(
        UserAccessToken.isValidUserAccessToken(`arg_${"a".repeat(36)}`),
      ).toBe(false);
    });

    it("returns false when the token is too short", () => {
      expect(
        UserAccessToken.isValidUserAccessToken(`arp_${"a".repeat(35)}`),
      ).toBe(false);
    });

    it("returns false when the token is too long", () => {
      expect(
        UserAccessToken.isValidUserAccessToken(`arp_${"a".repeat(37)}`),
      ).toBe(false);
    });
  });
});
