import { render } from "@react-email/render";
import { Request as ExpressRequest } from "express";

/**
 * Convert query string by supporting num:x and bool:x.
 */
export function queryStringToObject(
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

/**
 * Convert email template to plain text.
 */
export async function emailToText(rendered: {
  body: React.ReactNode;
  subject: string;
}) {
  const html = await render(rendered.body);
  return (
    html + `<pre style="padding: 16px;">subject: ${rendered.subject}</pre>`
  );
}
