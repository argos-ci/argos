import { Router } from "express";

import { Account } from "@/database/models";
import { getAccountUsageReport } from "@/database/services/usage-report";
import { emailToText, queryStringToObject } from "@/email/util";
import { asyncHandler } from "@/web/util";

import { notificationHandlers } from "./handlers";
import { handler as usageReportHandler } from "./handlers/usage_report";

export function getNotificationPreviewMiddleware(options: { path: string }) {
  const router: Router = Router();

  // The usage report computed from a real team's usage, read-only: nothing is
  // claimed nor sent. `?at=` previews it as of another date.
  router.get(
    "/usage_report/:accountSlug",
    asyncHandler(async (req, res) => {
      const account = await Account.query().findOne({
        slug: req.params["accountSlug"],
      });
      if (!account) {
        res.status(404).send("Account not found");
        return;
      }
      const at = typeof req.query["at"] === "string" ? req.query["at"] : null;
      const usageReport = await getAccountUsageReport(
        account,
        at ? new Date(at) : new Date(),
      );
      if (!usageReport) {
        res
          .status(404)
          .send(
            "No usage report: not on an annual usage-based plan, or the first month of the term has not closed",
          );
        return;
      }
      const rendered = usageReportHandler.email({
        ctx: {
          user: { id: "preview-user", name: "James" },
          preferencesUrl: null,
        },
        ...usageReport.data,
      });
      res.set("Content-Type", "text/html");
      res.send(await emailToText(rendered));
    }),
  );

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
          ctx: {
            user: { id: "preview-user", name: "James" },
            preferencesUrl: null,
          },
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
