import { Router } from "express";

import { UserNotificationPreference } from "@/database/models";
import { notificationCategoryMetadata } from "@/notification/categories";
import { verifyUnsubscribeToken } from "@/notification/unsubscribe";

import { asyncHandler } from "./util";

const router: Router = Router();

const UNSUBSCRIBE_PATH = "/account/notifications/unsubscribe";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char,
  );
}

function renderPage(args: {
  title: string;
  message: string;
  action?: { token: string; label: string };
}): string {
  const actionHtml = args.action
    ? `<form method="post" action="${UNSUBSCRIBE_PATH}?token=${encodeURIComponent(
        args.action.token,
      )}"><button type="submit">${escapeHtml(args.action.label)}</button></form>`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${escapeHtml(args.title)} • Argos</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f6f6f7; color: #1c1c1f; margin: 0; display: flex; min-height: 100vh; align-items: center; justify-content: center; }
      main { background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 32px; max-width: 420px; text-align: center; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      p { font-size: 14px; line-height: 1.5; color: #52525b; margin: 0 0 20px; }
      button { background: #5746af; color: #fff; border: 0; border-radius: 6px; padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(args.title)}</h1>
      <p>${escapeHtml(args.message)}</p>
      ${actionHtml}
    </main>
  </body>
</html>`;
}

const INVALID_PAGE = renderPage({
  title: "Invalid link",
  message: "This unsubscribe link is invalid or has expired.",
});

function getToken(query: unknown): string | null {
  if (typeof query === "object" && query !== null && "token" in query) {
    const token = (query as Record<string, unknown>)["token"];
    return typeof token === "string" ? token : null;
  }
  return null;
}

// The footer link lands here. We never mutate on GET (email clients and
// security scanners prefetch links) — instead we ask the user to confirm,
// which posts to the same URL.
router.get(
  UNSUBSCRIBE_PATH,
  asyncHandler(async (req, res) => {
    res.set("Content-Type", "text/html");
    res.set("Cache-Control", "no-store");
    const token = getToken(req.query);
    const payload = token ? verifyUnsubscribeToken(token) : null;
    if (!token || !payload) {
      res.status(400).send(INVALID_PAGE);
      return;
    }
    const label = notificationCategoryMetadata[payload.category].label;
    res.send(
      renderPage({
        title: "Unsubscribe",
        message: `Do you want to stop receiving ${label} email notifications from Argos?`,
        action: { token, label: "Unsubscribe" },
      }),
    );
  }),
);

// RFC 8058 one-click unsubscribe target (mail clients POST automatically), also
// used by the confirmation form above.
router.post(
  UNSUBSCRIBE_PATH,
  asyncHandler(async (req, res) => {
    res.set("Content-Type", "text/html");
    res.set("Cache-Control", "no-store");
    const token = getToken(req.query);
    const payload = token ? verifyUnsubscribeToken(token) : null;
    if (!payload) {
      res.status(400).send(INVALID_PAGE);
      return;
    }
    await UserNotificationPreference.query()
      .insert({
        userId: payload.userId,
        category: payload.category,
        channel: payload.channel,
        enabled: false,
      })
      .onConflict(["userId", "category", "channel"])
      .merge(["enabled", "updatedAt"]);
    const label = notificationCategoryMetadata[payload.category].label;
    res.send(
      renderPage({
        title: "Unsubscribed",
        message: `You have been unsubscribed from ${label} email notifications. You can re-enable them anytime in your Argos notification settings.`,
      }),
    );
  }),
);

export default router;
