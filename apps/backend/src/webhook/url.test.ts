import { describe, expect, it } from "vitest";

import { checkIsPublicAddress, parseWebhookUrl } from "./url";

describe("checkIsPublicAddress", () => {
  it.each([
    ["8.8.8.8", true],
    ["1.1.1.1", true],
    ["2606:4700:4700::1111", true],
    ["::ffff:8.8.8.8", true],
    ["0.0.0.0", false],
    ["10.1.2.3", false],
    ["100.64.0.1", false],
    ["127.0.0.1", false],
    ["127.255.255.254", false],
    ["169.254.169.254", false],
    ["172.16.0.1", false],
    ["172.31.255.255", false],
    ["192.168.1.1", false],
    ["198.18.0.1", false],
    ["224.0.0.1", false],
    ["255.255.255.255", false],
    ["::", false],
    ["::1", false],
    ["::ffff:127.0.0.1", false],
    ["::ffff:169.254.169.254", false],
    ["64:ff9b::a9fe:a9fe", false],
    ["fc00::1", false],
    ["fd12:3456::1", false],
    ["fe80::1", false],
    ["ff02::1", false],
    ["2002:7f00:1::", false],
    ["not-an-ip", false],
  ])("%s → %s", (address, expected) => {
    expect(checkIsPublicAddress(address)).toBe(expected);
  });

  it("keeps the IPv4 ranges next to private ones public", () => {
    expect(checkIsPublicAddress("172.32.0.1")).toBe(true);
    expect(checkIsPublicAddress("11.0.0.1")).toBe(true);
    expect(checkIsPublicAddress("100.128.0.1")).toBe(true);
  });
});

describe("parseWebhookUrl", () => {
  const strict = { allowPrivateNetwork: false };
  const local = { allowPrivateNetwork: true };

  it.each([
    ["https://example.com/hooks/argos", "https://example.com/hooks/argos"],
    ["  https://example.com/hook  ", "https://example.com/hook"],
    ["https://example.com/hook#section", "https://example.com/hook"],
    [
      "https://hooks.example.com/services/T0/B0?token=abc",
      "https://hooks.example.com/services/T0/B0?token=abc",
    ],
    ["https://8.8.8.8/hook", "https://8.8.8.8/hook"],
  ])("accepts %s", (input, expected) => {
    expect(parseWebhookUrl(input, strict)).toBe(expected);
  });

  it.each([
    ["example.com/hook", "This is not a valid URL."],
    ["http://example.com/hook", "The URL must start with https://."],
    ["ftp://example.com/hook", "The URL must start with https://."],
    [
      "https://user:pass@example.com/hook",
      "The URL cannot include a username or password.",
    ],
    ["https://localhost/hook", "The URL must point to a public address."],
    ["https://localhost./hook", "The URL must point to a public address."],
    ["https://api.localhost/hook", "The URL must point to a public address."],
    ["https://metadata/hook", "The URL must point to a public address."],
    ["https://127.0.0.1/hook", "The URL must point to a public address."],
    ["https://2130706433/hook", "The URL must point to a public address."],
    ["https://0x7f.1/hook", "The URL must point to a public address."],
    ["https://169.254.169.254/", "The URL must point to a public address."],
    ["https://[::1]/hook", "The URL must point to a public address."],
    [
      "https://[::ffff:10.0.0.1]/hook",
      "The URL must point to a public address.",
    ],
    [`https://example.com/${"a".repeat(2048)}`, "The URL is too long."],
  ])("rejects %s", (input, message) => {
    expect(() => parseWebhookUrl(input, strict)).toThrow(message);
  });

  it("accepts local HTTP endpoints when the private network is allowed", () => {
    expect(parseWebhookUrl("http://localhost:4000/hook", local)).toBe(
      "http://localhost:4000/hook",
    );
    expect(parseWebhookUrl("http://127.0.0.1:4000/", local)).toBe(
      "http://127.0.0.1:4000/",
    );
  });
});
