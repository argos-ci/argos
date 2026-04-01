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
