import memoize from "memoize";

const getCurrencyFormatter = memoize((currency: string, digits: number) => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
});

/**
 * Formats a number as a currency string using the Intl API.
 * @param value - The numeric value to format
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @param digits - The number of fraction digits to display (default: 2)
 * @returns The formatted currency string
 */
export function formatCurrency(
  value: number,
  currency: "EUR" | "USD",
  digits = 2,
) {
  return getCurrencyFormatter(currency, digits).format(value);
}

/**
 * Compact notation — 1.2K, 3.4M — for counts that would otherwise blow out a
 * narrow column.
 *
 * A module-level formatter rather than a hook: react-aria's
 * `useNumberFormatter` existed to read the locale from its `I18nProvider`, and
 * this app never rendered one, so it always resolved to the browser locale —
 * which is what `undefined` selects here.
 */
export const compactNumberFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
});

/** Axis ticks on the changes chart: "12 Mar, 14:30". */
export const chartTickDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatList(items: string[]) {
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  const formatter = new Intl.ListFormat("en-GB");
  return formatter.format(items);
}
