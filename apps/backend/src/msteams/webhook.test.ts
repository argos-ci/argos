import { afterEach, describe, expect, it, vi } from "vitest";

import { checkIsRetryable } from "@/util/error";

import type { AdaptiveCard } from "./card";
import { parseMsTeamsWebhookUrl, postCardToUrl } from "./webhook";

const VALID_URL =
  "https://prod-27.westeurope.logic.azure.com/workflows/abc/triggers/manual/paths/invoke?api-version=2016-06-01&sig=xyz";

const CARD: AdaptiveCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [{ type: "TextBlock", text: "Hello", wrap: true }],
};

describe("parseMsTeamsWebhookUrl", () => {
  it("accepts a Power Automate Workflows URL", () => {
    expect(parseMsTeamsWebhookUrl(VALID_URL)).toBe(VALID_URL);
  });

  // Shape actually handed out by the Teams "Workflows" template, captured from
  // a real tenant. The `:443` is explicit in the URL Teams copies.
  it("accepts the powerplatform.com URL Teams generates today", () => {
    const url =
      "https://default569837d4587c48a9b94a8e9e3915a4.e3.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/07/workflows/abc/triggers/manual/paths/invoke?api-version=1&sv=1.0&sig=redacted";
    // The default port is normalized away.
    expect(parseMsTeamsWebhookUrl(url)).toBe(url.replace(":443", ""));
  });

  it("accepts a legacy Microsoft 365 connector URL", () => {
    const url =
      "https://argos.webhook.office.com/webhookb2/guid@guid/IncomingWebhook/id/guid";
    expect(parseMsTeamsWebhookUrl(url)).toBe(url);
  });

  it("trims surrounding whitespace", () => {
    expect(parseMsTeamsWebhookUrl(`  ${VALID_URL}  `)).toBe(VALID_URL);
  });

  it("rejects a non-URL", () => {
    expect(() => parseMsTeamsWebhookUrl("not a url")).toThrow(
      "This is not a valid URL.",
    );
  });

  it("rejects plain HTTP", () => {
    expect(() =>
      parseMsTeamsWebhookUrl(
        "http://prod-27.westeurope.logic.azure.com/workflows/abc",
      ),
    ).toThrow("The webhook URL must use HTTPS.");
  });

  // The allowlist is what stops this feature being an SSRF primitive.
  it.each([
    "https://example.com/webhook",
    "https://localhost/webhook",
    "https://169.254.169.254/latest/meta-data",
    "https://logic.azure.com.evil.test/workflows/abc",
    "https://evil-logic.azure.com.attacker.test/x",
    "https://api.powerplatform.com.evil.test/x",
  ])("rejects %s", (url) => {
    expect(() => parseMsTeamsWebhookUrl(url)).toThrow(
      "does not look like a Microsoft Teams webhook URL",
    );
  });

  it("rejects a host that merely contains an allowed domain", () => {
    expect(() =>
      parseMsTeamsWebhookUrl("https://notlogic.azure.com.evil.test/x"),
    ).toThrow("does not look like a Microsoft Teams webhook URL");
  });
});

describe("postCardToUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the card wrapped in the Teams message envelope", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 202 }));

    await postCardToUrl({ url: VALID_URL, card: CARD });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(VALID_URL);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual({
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          contentUrl: null,
          content: CARD,
        },
      ],
    });
  });

  it("refuses to post to a host outside the allowlist", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      postCardToUrl({ url: "https://example.com/webhook", card: CARD }),
    ).rejects.toThrow("does not look like a Microsoft Teams webhook URL");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the response body when Teams rejects the message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Flow not found", { status: 404 }),
    );

    await expect(postCardToUrl({ url: VALID_URL, card: CARD })).rejects.toThrow(
      "Microsoft Teams rejected the message (HTTP 404): Flow not found",
    );
  });

  it("marks authentication failures as unretryable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Signature expired", { status: 403 }),
    );

    const error = await postCardToUrl({ url: VALID_URL, card: CARD }).catch(
      (error: unknown) => error,
    );

    expect(checkIsRetryable(error)).toBe(false);
  });
});
