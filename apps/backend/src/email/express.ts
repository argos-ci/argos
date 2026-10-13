import { Router } from "express";

import { asyncHandler } from "@/web/util";

import { emailTemplates } from "./templates";
import { emailToText, queryStringToObject } from "./util";

export function getEmailPreviewMiddleware(options: { path: string }) {
  const router: Router = Router();

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
