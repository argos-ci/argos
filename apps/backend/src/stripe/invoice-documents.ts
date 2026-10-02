import config from "@/config";
import type { StripeInvoice } from "@/database/models";

/** The two documents Stripe hosts for an invoice. */
export const INVOICE_DOCUMENTS = {
  view: "hosted_invoice_url",
  pdf: "invoice_pdf",
} as const;

export type InvoiceDocument = keyof typeof INVOICE_DOCUMENTS;

export function isInvoiceDocument(value: unknown): value is InvoiceDocument {
  return typeof value === "string" && Object.hasOwn(INVOICE_DOCUMENTS, value);
}

/**
 * Where the app links an invoice's document.
 *
 * Not Stripe's URL itself: it carries a token Stripe expires 30 days after the
 * invoice is finalized, and the mirror only re-reads the recent ones. A URL
 * kept from the last read lands an older invoice on Stripe's "this link has
 * expired" page, whose recovery form only answers the addresses the invoice
 * was emailed to. Pointing here instead resolves a fresh one on every click.
 */
export function getInvoiceDocumentUrl(
  invoice: StripeInvoice,
  document: InvoiceDocument,
): string {
  return new URL(
    `/invoices/${invoice.id}/${document}`,
    config.get("server.url"),
  ).toString();
}
