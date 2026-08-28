import { describe, expect, it } from "vitest";

import { startOfUTCMonth } from "@/util/utc-month";

import { classifyInvoice, getInvoiceRevenue, toEuros } from "./revenue";

describe("getInvoiceRevenue", () => {
  /** Stripe states amounts in the currency's minor unit. */
  function invoice(fields: {
    total: number;
    totalExcludingTax?: number | null;
    totalTaxesAmount?: number | null;
    currency?: string;
    credited?: number;
  }) {
    return {
      currency: fields.currency ?? "usd",
      total: fields.total,
      totalExcludingTax: fields.totalExcludingTax ?? null,
      totalTaxesAmount: fields.totalTaxesAmount ?? null,
      creditedAmountExcludingTax: fields.credited ?? 0,
    };
  }

  it("reads the amount excluding tax, in the currency's main unit", () => {
    // VAT collected for a state is not revenue.
    expect(
      getInvoiceRevenue(invoice({ total: 12_000, totalExcludingTax: 10_000 })),
    ).toEqual({ amount: 100, currency: "usd" });
  });

  it("takes the listed taxes off when no pre-tax total is stated", () => {
    // Falling back to the total alone would let the VAT through as revenue.
    expect(
      getInvoiceRevenue(invoice({ total: 12_000, totalTaxesAmount: 2_000 })),
    ).toEqual({ amount: 100, currency: "usd" });
  });

  it("reports the currency it was raised in", () => {
    expect(
      getInvoiceRevenue(
        invoice({
          total: 10_000,
          totalExcludingTax: 10_000,
          currency: "eur",
        }),
      ),
    ).toEqual({ amount: 100, currency: "eur" });
  });

  it("nets out what the credit notes gave back", () => {
    // An invoice refunded after the fact keeps its amount intact, so the
    // credited half has to be taken off or the total counts money given back.
    expect(
      getInvoiceRevenue(
        invoice({
          total: 10_000,
          totalExcludingTax: 10_000,
          credited: 4_000,
        }),
      ).amount,
    ).toBe(60);
  });

  it("reports a fully credited taxed invoice as nothing", () => {
    // Both sides of the subtraction are ex-tax: taking the credit note's
    // tax-inclusive total off the ex-tax base would report minus the VAT here.
    expect(
      getInvoiceRevenue(
        invoice({
          total: 12_000,
          totalExcludingTax: 10_000,
          credited: 10_000,
        }),
      ).amount,
    ).toBe(0);
  });
});

describe("toEuros", () => {
  it("brings dollars in at the fixed rate", () => {
    expect(toEuros({ amount: 1000, currency: "usd" })).toBe(855);
  });

  it("leaves euros as they are", () => {
    expect(toEuros({ amount: 1000, currency: "eur" })).toBe(1000);
  });

  it("keeps an unknown currency at parity, for the foreign caveat to own", () => {
    expect(toEuros({ amount: 1000, currency: "gbp" })).toBe(1000);
  });
});

describe("classifyInvoice", () => {
  /** Cases below are the real shapes the book was found to hold. */
  function invoice(fields: {
    reason: string | null;
    issued: string;
    period?: [string, string];
  }) {
    return {
      billingReason: fields.reason,
      stripeCreatedAt: new Date(fields.issued).toISOString(),
      periodStart: fields.period
        ? new Date(fields.period[0]).toISOString()
        : null,
      periodEnd: fields.period
        ? new Date(fields.period[1]).toISOString()
        : null,
    };
  }

  const coverage = (from: string, to: string) => ({
    kind: "contract" as const,
    coverage: { start: Date.parse(from), end: Date.parse(to) },
  });

  it("reads a year-long bill as a contract, whatever Stripe filed it under", () => {
    // A monthly-to-yearly conversion arrives as a `subscription_update`.
    expect(
      classifyInvoice(
        invoice({
          reason: "subscription_update",
          issued: "2026-05-23",
          period: ["2026-05-23", "2027-05-23"],
        }),
        { customerHasTerm: true },
      ),
    ).toEqual(coverage("2026-05-23", "2027-05-23"));
  });

  it("reads a monthly cycle as the month it was raised in", () => {
    expect(
      classifyInvoice(
        invoice({
          reason: "subscription_cycle",
          issued: "2026-03-23",
          period: ["2026-02-23", "2026-03-23"],
        }),
        { customerHasTerm: true },
      ),
    ).toEqual({ kind: "monthly" });
  });

  it("spreads an arrears-stamped contract over the year ahead", () => {
    // An annual bill whose period ends the day it was raised is collecting for
    // the year to come, not paying for one already over.
    expect(
      classifyInvoice(
        invoice({
          reason: "manual",
          issued: "2025-10-30",
          period: ["2024-10-30", "2025-10-30"],
        }),
        { customerHasTerm: true },
      ),
    ).toEqual(coverage("2025-10-30", "2026-10-30"));
  });

  it("spreads a sales invoice stating no period over the year from issuance", () => {
    expect(
      classifyInvoice(invoice({ reason: "manual", issued: "2026-02-11" }), {
        customerHasTerm: true,
      }),
    ).toEqual(coverage("2026-02-11", "2027-02-11"));
  });

  it("treats a few days stamped on a sales invoice as no period at all", () => {
    // Dashboard invoices routinely carry the day they were raised; read as
    // coverage, a year's contract would land in a single week.
    expect(
      classifyInvoice(
        invoice({
          reason: "manual",
          issued: "2026-02-11",
          period: ["2026-02-11", "2026-02-13"],
        }),
        { customerHasTerm: true },
      ),
    ).toEqual(coverage("2026-02-11", "2027-02-11"));
  });

  it("reads a one-off from a customer with no term as that month's bill", () => {
    // The same shape from a customer Argos never billed in terms is a bill
    // raised by hand, not a year's contract stated without its period.
    expect(
      classifyInvoice(invoice({ reason: "manual", issued: "2026-02-11" }), {
        customerHasTerm: false,
      }),
    ).toEqual({ kind: "monthly" });
  });

  it("reads a hand-raised month as the month it covers", () => {
    // Legacy and partner deals are billed this way, month after month.
    expect(
      classifyInvoice(
        invoice({
          reason: "manual",
          issued: "2026-03-10",
          period: ["2026-02-21", "2026-03-21"],
        }),
        { customerHasTerm: false },
      ),
    ).toEqual({ kind: "monthly" });
  });

  it("keeps a sales-led upsell on the stretch it was sold for", () => {
    // Sold mid-term, covering from the sale to the contract's renewal date.
    expect(
      classifyInvoice(
        invoice({
          reason: "manual",
          issued: "2026-06-09",
          period: ["2026-06-08", "2026-10-31"],
        }),
        { customerHasTerm: true },
      ),
    ).toEqual(coverage("2026-06-08", "2026-10-31"));
  });
});

describe("startOfUTCMonth", () => {
  it("cuts the month in UTC, not where the process happens to run", () => {
    // The instant below is still July in UTC and already August in Paris. Cut
    // locally, an invoice stamped here would be filed a month off.
    const lateJuly = new Date("2026-07-31T23:30:00Z");

    expect(startOfUTCMonth(lateJuly, 0).toISOString()).toBe(
      "2026-07-01T00:00:00.000Z",
    );
  });

  it.each([
    [0, "2026-08-01T00:00:00.000Z"],
    [-1, "2026-07-01T00:00:00.000Z"],
    [-2, "2026-06-01T00:00:00.000Z"],
  ])("walks %i months back", (offset, expected) => {
    expect(
      startOfUTCMonth(new Date("2026-08-22T12:00:00Z"), offset).toISOString(),
    ).toBe(expected);
  });

  it("walks back across a year boundary", () => {
    expect(
      startOfUTCMonth(new Date("2026-01-15T12:00:00Z"), -2).toISOString(),
    ).toBe("2025-11-01T00:00:00.000Z");
  });
});
