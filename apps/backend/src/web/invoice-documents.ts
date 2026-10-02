import { Router } from "express";
import { z } from "zod";

import { resolveSession } from "@/auth/session";
import { readSessionCookie } from "@/auth/session-cookie";
import config from "@/config";
import { Account, StripeInvoice, User } from "@/database/models";
import { stripe } from "@/stripe";
import {
  INVOICE_DOCUMENTS,
  isInvoiceDocument,
} from "@/stripe/invoice-documents";
import { boom } from "@/util/error";

import { asyncHandler } from "./util";

/**
 * Whether the user is an admin of an account billed on the customer, the
 * same rule the invoice list is read under.
 */
async function canReadInvoices(
  stripeCustomerId: string,
  user: User,
): Promise<boolean> {
  const accounts = await Account.query().where({ stripeCustomerId });
  const permissions = await Promise.all(
    accounts.map((account) => account.$getPermissions(user)),
  );
  return permissions.some((granted) => granted.includes("admin"));
}

const ParamsSchema = z.object({
  invoiceId: z.string().regex(/^\d+$/),
  document: z.string().refine(isInvoiceDocument),
});

const router: Router = Router();

router.get(
  "/invoices/:invoiceId/:document",
  asyncHandler(async (req, res) => {
    const params = ParamsSchema.safeParse(req.params);
    if (!params.success) {
      throw boom(404, "Not found");
    }
    const { invoiceId, document } = params.data;

    const rawToken = readSessionCookie(req);
    const session = rawToken ? await resolveSession(rawToken) : null;
    if (!session) {
      const requestUrl = new URL(req.originalUrl, config.get("server.url"));
      const loginUrl = new URL("/login", config.get("server.url"));
      loginUrl.searchParams.set("r", requestUrl.toString());
      res.redirect(loginUrl.toString());
      return;
    }

    const [invoice, user] = await Promise.all([
      StripeInvoice.query().findById(invoiceId),
      User.query().findById(session.userId),
    ]);
    if (!user) {
      throw boom(401, "Invalid session");
    }
    if (!invoice) {
      throw boom(404, "Invoice not found");
    }

    // Read from Stripe while the permission is checked, but only settle it
    // after: a Stripe error must not turn a stranger's 404 into a 500 that
    // confirms the id exists.
    const stripeInvoice = Promise.allSettled([
      stripe.invoices.retrieve(invoice.stripeInvoiceId),
    ]).then(([result]) => result);
    if (!(await canReadInvoices(invoice.stripeCustomerId, user))) {
      throw boom(404, "Invoice not found");
    }
    const retrieved = await stripeInvoice;
    if (retrieved.status === "rejected") {
      throw retrieved.reason;
    }

    const url = retrieved.value[INVOICE_DOCUMENTS[document]];
    if (!url) {
      throw boom(404, "This invoice has no document to show");
    }

    // The URL carries Stripe's access token: a cached redirect would replay it
    // after it expired, which is the bug this route exists to fix.
    res.set("Cache-Control", "no-store");
    res.redirect(url);
  }),
);

export default router;
