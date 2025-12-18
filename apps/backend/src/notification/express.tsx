import { Router } from "express";

import { emailToText, queryStringToObject } from "@/email/util";
import { asyncHandler } from "@/web/util";

import { notificationHandlers } from "./handlers";

export function getNotificationPreviewMiddleware(options: { path: string }) {
  const router: Router = Router();

  notificationHandlers.forEach((handler) => {
    router.get("/", (_req, res) => {
      res.set("Content-Type", "text/html");
      const links = notificationHandlers.map((handler) => {
        return `<li><a href="${options.path}/${handler.type}">${handler.type}</a></li>`;
      });
      res.send(`<ul>${links.join("")}</ul>`);
    });
    router.get(
      `/${handler.type}`,
      asyncHandler(async (req, res) => {
        const rendered = handler.email({
          ctx: { user: { name: "James" } },
          ...(handler.previewData as any),
          ...queryStringToObject(req.query),
        });
        res.set("Content-Type", "text/html");
        res.send(await emailToText(rendered));
      }),
    );
  });

  return router;
}
