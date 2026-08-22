import { describe, expect, it } from "vitest";

import { getInvoiceRevenue, startOfUTCMonth } from "./revenue";

describe("getInvoiceRevenue", () => {
  /** Stripe states amounts in the currency's minor unit. */
  function invoice(fields: {
    total: number;
    total_excluding_tax?: number | null;
    pre?: number;
    post?: number;
  }) {
    return {
      total: fields.total,
      total_excluding_tax: fields.total_excluding_tax ?? null,
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
    ).toBe(100);
  });

  it("falls back to the total when no tax is broken out", () => {
    expect(getInvoiceRevenue(invoice({ total: 10_000 }))).toBe(100);
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
      ),
    ).toBe(60);
  });

  it("reports a fully credited invoice as nothing", () => {
    expect(
      getInvoiceRevenue(
        invoice({ total: 10_000, total_excluding_tax: 10_000, post: 10_000 }),
      ),
    ).toBe(0);
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
