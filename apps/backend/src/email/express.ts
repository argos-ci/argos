import { Router } from "express";

import { Account } from "@/database/models";
import { getAccountUsageReport } from "@/database/services/usage-report";
import { asyncHandler } from "@/web/util";

import { emailTemplates } from "./templates";
import { handler as usageReportTemplate } from "./templates/usage_report";
import { emailToText, queryStringToObject } from "./util";

export function getEmailPreviewMiddleware(options: { path: string }) {
  const router: Router = Router();

  // The usage report computed from a real team's usage, read-only: nothing is
  // claimed nor sent, and the unsubscribe link is a placeholder since the
  // preview is addressed to no one. `?at=` previews it as of another date.
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
      const rendered = usageReportTemplate.email({
        ...usageReport.data,
        unsubscribeUrl: usageReportTemplate.previewData.unsubscribeUrl,
      });
      res.send(await emailToText(rendered));
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
