import { render } from "@react-email/render";
import { Request as ExpressRequest, Router } from "express";

import { asyncHandler } from "@/web/util.js";

import { notificationHandlers } from "./handlers";

const router: Router = Router();

notificationHandlers.forEach((handler) => {
  router.get(
    `/${handler.type}`,
    asyncHandler(async (req, res) => {
      const rendered = handler.email({
        ctx: { user: { name: "James" } },
        ...(handler.previewData as any),
        ...convertQueryString(req.query),
      });
      const html = await render(rendered.body);
      res.send(
        html + `<pre style="padding: 16px;">subject: ${rendered.subject}</pre>`,
      );
    }),
  );
});

export { router as notificationPreview };

/**
 * Convert query string by supporting num:x and bool:x.
 */
function convertQueryString(
  query: ExpressRequest["query"],
): Record<string, any> {
  if (
    !query ||
    typeof query !== "object" ||
    Array.isArray(query) ||
    query === null
  ) {
    return {};
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value !== "string") {
      continue;
    }
    if (value.startsWith("num:")) {
      result[key] = Number(value.slice(4));
    } else if (value.startsWith("bool:")) {
      result[key] = value.slice(5) === "true";
    } else {
      result[key] = value;
    }
  }
  return result;
}
