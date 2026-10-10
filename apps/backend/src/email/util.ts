import { Request as ExpressRequest } from "express";
import { render } from "react-email";

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

/**
 * An amount of money in whole units of its currency, the way emails state
 * overage and spend limits.
 */
export function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
