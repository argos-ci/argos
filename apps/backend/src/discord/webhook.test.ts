import { afterEach, describe, expect, it, vi } from "vitest";

import { checkIsRetryable, HTTPError } from "@/util/error";

import type { DiscordEmbed } from "./embed";
import {
  obfuscateDiscordWebhookUrl,
  parseDiscordWebhookUrl,
  postEmbedToUrl,
} from "./webhook";

const TOKEN = "aBcDeF_gHiJkLmNoPqRsTuVwXyZ-0123456789";
const VALID_URL = `https://discord.com/api/webhooks/1234567890123456789/${TOKEN}`;

const EMBED: DiscordEmbed = { title: "Hello" };

describe("parseDiscordWebhookUrl", () => {
  it("accepts the URL the Integrations settings hand out", () => {
    expect(parseDiscordWebhookUrl(VALID_URL)).toBe(VALID_URL);
  });

  it("accepts the legacy discordapp.com domain", () => {
    const url = `https://discordapp.com/api/webhooks/1234567890123456789/${TOKEN}`;
    expect(parseDiscordWebhookUrl(url)).toBe(url);
  });

  it.each(["canary.discord.com", "ptb.discord.com"])(
    "accepts the %s release channel",
    (host) => {
      const url = `https://${host}/api/webhooks/1234567890123456789/${TOKEN}`;
      expect(parseDiscordWebhookUrl(url)).toBe(url);
    },
  );

  it("accepts a version-pinned URL", () => {
    const url = `https://discord.com/api/v10/webhooks/1234567890123456789/${TOKEN}`;
    expect(parseDiscordWebhookUrl(url)).toBe(url);
  });

  // `?thread_id=` targets a thread inside the channel, which is worth keeping.
  it("keeps the query string", () => {
    const url = `${VALID_URL}?thread_id=987654321`;
    expect(parseDiscordWebhookUrl(url)).toBe(url);
  });

  it("drops a trailing slash", () => {
    expect(parseDiscordWebhookUrl(`${VALID_URL}/`)).toBe(VALID_URL);
  });

  it("trims surrounding whitespace", () => {
    expect(parseDiscordWebhookUrl(`  ${VALID_URL}  `)).toBe(VALID_URL);
  });

  it("rejects a non-URL", () => {
    expect(() => parseDiscordWebhookUrl("not a url")).toThrow(
      "This is not a valid URL.",
    );
  });

  it("rejects plain HTTP", () => {
    expect(() =>
      parseDiscordWebhookUrl(
        `http://discord.com/api/webhooks/1234567890123456789/${TOKEN}`,
      ),
    ).toThrow("The webhook URL must use HTTPS.");
  });

  // The allowlist is what stops this feature being an SSRF primitive. Hosts are
  // matched exactly, so no subdomain of an allowed domain gets through either.
  it.each([
    "https://example.com/api/webhooks/1/t",
    "https://localhost/api/webhooks/1/t",
    "https://169.254.169.254/api/webhooks/1/t",
    "https://discord.com.evil.test/api/webhooks/1/t",
    "https://evil-discord.com/api/webhooks/1/t",
    "https://notdiscord.com/api/webhooks/1/t",
    "https://webhooks.discord.com/api/webhooks/1/t",
  ])("rejects %s", (url) => {
    expect(() => parseDiscordWebhookUrl(url)).toThrow(
      "does not look like a Discord webhook URL",
    );
  });

  // An allowed host is not enough: the path is pinned so we always know where
  // the token sits, which is what makes obfuscation reliable.
  it.each([
    "https://discord.com/api/users/@me",
    "https://discord.com/api/webhooks/1234567890123456789",
    "https://discord.com/api/webhooks/not-an-id/token",
    `https://discord.com/api/webhooks/1234567890123456789/${TOKEN}/messages/1`,
  ])("rejects %s", (url) => {
    expect(() => parseDiscordWebhookUrl(url)).toThrow(
      "does not look like a Discord webhook URL",
    );
  });
});

describe("obfuscateDiscordWebhookUrl", () => {
  // The id is public and tells two webhooks apart; the token is the credential.
  it("drops the token, keeping the webhook id", () => {
    expect(obfuscateDiscordWebhookUrl(VALID_URL)).toBe(
      "https://discord.com/api/webhooks/1234567890123456789/***",
    );
  });

  it("keeps the API version prefix", () => {
    expect(
      obfuscateDiscordWebhookUrl(
        `https://discord.com/api/v10/webhooks/1234567890123456789/${TOKEN}`,
      ),
    ).toBe("https://discord.com/api/v10/webhooks/1234567890123456789/***");
  });

  it("leaves the query string alone", () => {
    expect(obfuscateDiscordWebhookUrl(`${VALID_URL}?thread_id=987`)).toBe(
      "https://discord.com/api/webhooks/1234567890123456789/***?thread_id=987",
    );
  });
});

describe("postEmbedToUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the embed under the Argos username", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      // A successful execute-webhook call answers 204 with no body.
      .mockResolvedValue(new Response(null, { status: 204 }));

    await postEmbedToUrl({ url: VALID_URL, embed: EMBED });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(VALID_URL);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual({
      username: "Argos",
      embeds: [EMBED],
    });
  });

  it("refuses to post to a host outside the allowlist", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      postEmbedToUrl({
        url: "https://example.com/api/webhooks/1/t",
        embed: EMBED,
      }),
    ).rejects.toThrow("does not look like a Discord webhook URL");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the response body when Discord rejects the message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"message": "Unknown Webhook", "code": 10015}', {
        status: 404,
      }),
    );

    await expect(
      postEmbedToUrl({ url: VALID_URL, embed: EMBED }),
    ).rejects.toThrow(
      'Discord rejected the message (HTTP 404): {"message": "Unknown Webhook", "code": 10015}',
    );
  });

  // A broken webhook is the user's to fix, so it is reported as a client error
  // and never retried.
  it.each([400, 401, 403, 404])(
    "reports a %i from Discord as a user error",
    async (status) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Unknown Webhook", { status }),
      );

      const error = await postEmbedToUrl({
        url: VALID_URL,
        embed: EMBED,
      }).catch((error: unknown) => error);

      expect(error).toBeInstanceOf(HTTPError);
      expect((error as HTTPError).statusCode).toBe(400);
      expect(checkIsRetryable(error)).toBe(false);
    },
  );

  // Throttling and outages are ours to wait out.
  it.each([429, 503])("keeps a %i from Discord retryable", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Try again later", { status }),
    );

    const error = await postEmbedToUrl({ url: VALID_URL, embed: EMBED }).catch(
      (error: unknown) => error,
    );

    expect(error).toBeInstanceOf(HTTPError);
    expect((error as HTTPError).statusCode).toBe(502);
    expect(checkIsRetryable(error)).toBe(true);
  });
});
