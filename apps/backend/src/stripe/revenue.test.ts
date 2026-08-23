import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import type { ContractInvoiceCandidate } from "./revenue";
import {
  findContractInvoices,
  getInvoiceRevenue,
  startOfUTCMonth,
  toEuros,
} from "./revenue";

describe("getInvoiceRevenue", () => {
  /** Stripe states amounts in the currency's minor unit. */
  function invoice(fields: {
    total: number;
    total_excluding_tax?: number | null;
    taxes?: number[];
    currency?: string;
    pre?: number;
    post?: number;
  }) {
    return {
      currency: fields.currency ?? "usd",
      total: fields.total,
      total_excluding_tax: fields.total_excluding_tax ?? null,
      total_taxes: fields.taxes?.map((amount) => ({ amount })) ?? null,
      pre_payment_credit_notes_amount: fields.pre ?? 0,
      post_payment_credit_notes_amount: fields.post ?? 0,
    };
  }

  it("reads the amount excluding tax, in the currency's main unit", () => {
    // VAT collected for a state is not revenue.
    expect(
      getInvoiceRevenue(
        invoice({ total: 12_000, total_excluding_tax: 10_000 }),
      ),
    ).toEqual({ amount: 100, currency: "usd" });
  });

  it("takes the listed taxes off when no pre-tax total is stated", () => {
    // Falling back to the total alone would let the VAT through as revenue.
    expect(
      getInvoiceRevenue(invoice({ total: 12_000, taxes: [1_500, 500] })),
    ).toEqual({ amount: 100, currency: "usd" });
  });

  it("reports the currency it was raised in", () => {
    expect(
      getInvoiceRevenue(
        invoice({
          total: 10_000,
          total_excluding_tax: 10_000,
          currency: "eur",
        }),
      ),
    ).toEqual({ amount: 100, currency: "eur" });
  });

  it("nets out credit notes issued before and after payment", () => {
    // An invoice refunded after the fact keeps its amount intact, so the
    // credited half has to be taken off or the total counts money given back.
    expect(
      getInvoiceRevenue(
        invoice({
          total: 10_000,
          total_excluding_tax: 10_000,
          pre: 1_500,
          post: 2_500,
        }),
      ).amount,
    ).toBe(60);
  });

  it("reports a fully credited invoice as nothing", () => {
    expect(
      getInvoiceRevenue(
        invoice({ total: 10_000, total_excluding_tax: 10_000, post: 10_000 }),
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

describe("findContractInvoices", () => {
  const seconds = (iso: string) => Date.parse(iso) / 1000;

  /** Cases below are the real shapes the yearly book was found to hold. */
  function candidate(fields: {
    reason: Stripe.Invoice.BillingReason | null;
    total: number;
    /** Each entry is one line's covered stretch. */
    periods: [string, string][];
  }): ContractInvoiceCandidate & { total: number } {
    return {
      billing_reason: fields.reason,
      total: fields.total,
      lines: {
        data: fields.periods.map(([start, end]) => ({
          period: { start: seconds(start), end: seconds(end) },
        })),
      },
    };
  }

  it("picks the year-long conversion invoice over its same-day true-up", () => {
    // A team converted from monthly to yearly mid-stream: the contract is a
    // `subscription_update` covering a year, raised alongside a last month of
    // usage — and behind them, months of cycle invoices from before.
    const trueUp = candidate({
      reason: "subscription_update",
      total: 758_724,
      periods: [["2026-04-23", "2026-05-23"]],
    });
    const contract = candidate({
      reason: "subscription_update",
      total: 6_480_000,
      periods: [["2026-05-23", "2027-05-23"]],
    });
    const oldCycle = candidate({
      reason: "subscription_cycle",
      total: 745_028,
      periods: [["2026-03-23", "2026-04-23"]],
    });

    expect(findContractInvoices([trueUp, contract, oldCycle])).toEqual([
      contract,
    ]);
    expect(findContractInvoices([contract, trueUp, oldCycle])).toEqual([
      contract,
    ]);
  });

  it("adds a partial-period upsell on top of the annual bill", () => {
    // A contract billed by hand, then upsold mid-year: the upsell covers the
    // stretch from its sale to the contract's renewal date, and both invoices
    // are the contract's worth.
    const upsell = candidate({
      reason: "manual",
      total: 3_260_000,
      periods: [["2026-06-08", "2026-10-31"]],
    });
    const annual = candidate({
      reason: "manual",
      total: 4_588_994,
      periods: [["2024-10-30", "2025-10-30"]],
    });

    expect(findContractInvoices([upsell, annual])).toEqual([upsell, annual]);
  });

  it("drops an upsell older than the annual bill", () => {
    // A renewal bakes the upsells sold before it into its own amount.
    const annual = candidate({
      reason: "subscription_cycle",
      total: 1_500_000,
      periods: [["2026-01-02", "2027-01-02"]],
    });
    const bakedIn = candidate({
      reason: "manual",
      total: 300_000,
      periods: [["2025-06-01", "2026-01-02"]],
    });

    expect(findContractInvoices([annual, bakedIn])).toEqual([annual]);
  });

  it("keeps only the newest of two year-spanning bills", () => {
    // A contract replaced mid-stream — a new subscription, or last year's
    // renewal behind this year's — counts once.
    const thisYear = candidate({
      reason: "subscription_create",
      total: 1_590_000,
      periods: [["2026-01-02", "2027-01-02"]],
    });
    const lastYear = candidate({
      reason: "subscription_cycle",
      total: 1_773_605,
      periods: [["2025-01-03", "2026-01-03"]],
    });

    expect(findContractInvoices([thisYear, lastYear])).toEqual([thisYear]);
  });

  it("lets a period-less sales invoice replace the annual bill", () => {
    // A dashboard invoice often stamps a single day rather than the stretch
    // the money covers; raised after the annual bill, it re-bills the whole
    // contract rather than adding to it.
    const reBilled = candidate({
      reason: "manual",
      total: 1_050_000,
      periods: [["2026-02-12", "2026-02-12"]],
    });
    const previous = candidate({
      reason: "subscription_cycle",
      total: 1_000_000,
      periods: [["2025-01-24", "2026-01-24"]],
    });

    expect(findContractInvoices([reBilled, previous])).toEqual([reBilled]);
  });

  it("skips the zero invoice a sales-opened subscription starts on", () => {
    const opening = candidate({
      reason: "subscription_create",
      total: 0,
      periods: [["2026-06-02", "2026-06-17"]],
    });

    expect(findContractInvoices([opening])).toEqual([]);
  });

  it("falls back to the newest sales invoice when no bill spans a year", () => {
    const renewal = candidate({
      reason: "manual",
      total: 1_050_000,
      periods: [["2026-02-12", "2026-02-12"]],
    });

    expect(findContractInvoices([renewal])).toEqual([renewal]);
  });

  it("reports nothing when no invoice reads as a contract", () => {
    const monthlyCycle = candidate({
      reason: "subscription_cycle",
      total: 96_000,
      periods: [["2026-02-23", "2026-03-23"]],
    });

    expect(findContractInvoices([monthlyCycle])).toEqual([]);
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
