import gqlTag from "graphql-tag";

import { getInvoiceDocumentUrl } from "@/stripe/invoice-documents";

import {
  IInvoiceStatus,
  type IResolvers,
} from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum InvoiceStatus {
    "Raised, not settled yet."
    open
    paid
    "Canceled — it was raised in error and owes nothing."
    void
    "Written off after collection failed."
    uncollectible
  }

  """
  An invoice Stripe raised on the account, read from Argos's mirror of them.

  Amounts are in the currency's major unit, as they read on the document.
  """
  type Invoice implements Node {
    id: ID!
    "The number that reads on the document — how a customer refers to it."
    number: String
    "When Stripe raised it."
    date: DateTime!
    "What it comes to, tax included."
    total: Float!
    "The ISO code it was raised in, lowercase, as Stripe states it."
    currency: String!
    status: InvoiceStatus!
    """
    What the payments gave back, tax included. Stripe keeps a refunded invoice
    paid, so this is what tells it apart.
    """
    refundedAmount: Float!
    """
    Stripe's hosted copy, where it can be read and paid. An Argos URL that
    redirects to a freshly signed Stripe one, since Stripe's own expire.
    """
    hostedUrl: String
    "The PDF, behind the same redirect."
    pdfUrl: String
  }

  type InvoiceConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Invoice!]!
  }

  "One charge on the invoice to come."
  type UpcomingInvoiceLine {
    id: ID!
    description: String!
    amount: Float!
  }

  """
  What the next invoice would come to if it were raised now.

  Previewed from Stripe at read time, so it carries everything that moves the
  figure — the plan, the metered screenshots consumed so far, add-ons, coupons,
  tax and any mid-period proration. It is a forecast: usage keeps accruing
  until the period closes.
  """
  type UpcomingInvoice {
    "What coupons take off, as a positive amount."
    discountAmount: Float!
    taxAmount: Float!
    "Everything above, resolved — what the account will owe."
    total: Float!
    currency: String!
    """
    The stretch of service it will pay for. Its end is also when Stripe raises
    it, which is why there is no separate date.
    """
    periodStart: DateTime!
    periodEnd: DateTime!
    """
    What the total is made of, empty when Stripe did not state every line —
    a breakdown that does not add up to its own total is worse than none.
    """
    lines: [UpcomingInvoiceLine!]!
  }
`;

/** Stripe's invoice statuses, minus the drafts the mirror does not keep. */
const INVOICE_STATUSES: Record<string, IInvoiceStatus> = {
  open: IInvoiceStatus.Open,
  paid: IInvoiceStatus.Paid,
  void: IInvoiceStatus.Void,
  uncollectible: IInvoiceStatus.Uncollectible,
};

export const resolvers: IResolvers = {
  Invoice: {
    date: (invoice) => new Date(invoice.stripeCreatedAt),
    // The mirror keeps Stripe's minor units; the reader gets the figure that
    // reads on the document.
    total: (invoice) => invoice.total / 100,
    refundedAmount: (invoice) => invoice.refundedAmount / 100,
    status: (invoice) => {
      const status = INVOICE_STATUSES[invoice.status];
      if (!status) {
        throw new Error(`Unknown invoice status "${invoice.status}"`);
      }
      return status;
    },
    // The mirrored URLs only say whether Stripe has the document; the link
    // itself goes through the redirect, which signs a fresh one.
    hostedUrl: (invoice) =>
      invoice.hostedInvoiceUrl ? getInvoiceDocumentUrl(invoice, "view") : null,
    pdfUrl: (invoice) =>
      invoice.invoicePdfUrl ? getInvoiceDocumentUrl(invoice, "pdf") : null,
  },
};
