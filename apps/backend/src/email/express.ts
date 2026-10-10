import { Router } from "express";

import { resolveSession } from "@/auth/session";
import { readSessionCookie } from "@/auth/session-cookie";
import { Account, User } from "@/database/models";
import { getAccountMonthlyReport } from "@/database/services/monthly-report";
import { boom } from "@/util/error";
import { asyncHandler } from "@/web/util";

import { emailTemplates } from "./templates";
import { handler as monthlyReportTemplate } from "./templates/monthly_report";
import { emailToText, queryStringToObject } from "./util";

export function getEmailPreviewMiddleware(options: { path: string }) {
  const router: Router = Router();

  // The monthly report computed from a real team's data, read-only: nothing
  // is sent, and the unsubscribe link is a placeholder since the preview is
  // addressed to no one. `?at=` previews it as of another date. The data is
  // real, production data in prod-ro mode, so only the team's admins (and
  // staff) can read it.
  router.get(
    "/monthly_report/:accountSlug",
    asyncHandler(async (req, res) => {
      const rawToken = readSessionCookie(req);
      const session = rawToken ? await resolveSession(rawToken) : null;
      const [user, account] = await Promise.all([
        session ? User.query().findById(session.userId) : null,
        Account.query().findOne({ slug: req.params["accountSlug"] }),
      ]);
      const permissions = account
        ? await account.$getPermissions(user ?? null)
        : [];
      if (!account || !permissions.includes("admin")) {
        throw boom(404, "Not found");
      }
      const at =
        typeof req.query["at"] === "string"
          ? new Date(req.query["at"])
          : new Date();
      if (Number.isNaN(at.getTime())) {
        throw boom(400, "Invalid date in ?at=");
      }
      const data = await getAccountMonthlyReport(account, at);
      if (!data) {
        res
          .status(404)
          .send(
            "No monthly report: not on an annual usage-based plan, or in the first month of the term",
          );
        return;
      }
      const rendered = monthlyReportTemplate.email({
        ...data,
        unsubscribeUrl: monthlyReportTemplate.previewData.unsubscribeUrl,
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
