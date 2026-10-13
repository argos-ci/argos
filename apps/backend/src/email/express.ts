import { Router } from "express";

import { Account } from "@/database/models";
import { getMonthlyReportPreviewData } from "@/database/services/monthly-report";
import { asyncHandler } from "@/web/util";

import { emailTemplates } from "./templates";
import { handler as monthlyReport } from "./templates/monthly_report";
import { emailToText, queryStringToObject } from "./util";

const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function getEmailPreviewMiddleware(options: { path: string }) {
  const router: Router = Router();

  // The monthly report of a team on the data of the database the server reads,
  // production's under `pnpm run dev:prod-ro`, as of the last one it was sent.
  // Unlike the samples, it reads a team's data without a session: only this
  // machine may ask, not the network `dev:prod-ro:mobile` listens on.
  router.get(
    "/monthly_report/:accountSlug",
    asyncHandler(async (req, res) => {
      if (!LOOPBACK_ADDRESSES.has(req.socket.remoteAddress ?? "")) {
        res.status(403).send("Only from this machine.");
        return;
      }
      const account = await Account.query().findOne({
        slug: req.params["accountSlug"],
      });
      if (!account) {
        res.status(404).send("No account with this slug.");
        return;
      }
      const sentAt = account.lastMonthlyReportAt
        ? new Date(account.lastMonthlyReportAt)
        : new Date();
      // Sending moved `lastMonthlyReportAt`, which the news start from: as it
      // was before, the news are the latest ones.
      const data = await getMonthlyReportPreviewData(
        account.$clone().$set({ lastMonthlyReportAt: null }),
        sentAt,
      );
      if (!data) {
        res.status(404).send("This account has no monthly report.");
        return;
      }
      res.send(await emailToText(monthlyReport.email(data)));
    }),
  );

  emailTemplates.forEach((template) => {
    router.get("/", (_req, res) => {
      res.set("Content-Type", "text/html");
      const links = emailTemplates.map((template) => {
        return `<li><a href="${options.path}/${template.type}">${template.type}</a></li>`;
      });
      res.send(`<ul>${links.join("")}</ul>`);
    });
    router.get(
      `/${template.type}`,
      asyncHandler(async (req, res) => {
        const rendered = template.email({
          ...(template.previewData as any),
          ...queryStringToObject(req.query),
        });
        res.send(await emailToText(rendered));
      }),
    );
  });

  return router;
}
