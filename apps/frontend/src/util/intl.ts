import memoize from "memoize";

const numberFormatter = new Intl.NumberFormat();

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
 * Formats a number using the Intl API with locale-specific formatting.
 * @param value - The numeric value to format
 * @returns The formatted number string with appropriate thousands separators
 */
export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

const listFormatter = new Intl.ListFormat(undefined, {
  style: "long",
  type: "conjunction",
});

/**
 * Formats an array of strings into a human-readable list using the Intl API.
 * For example: ["apple", "banana", "orange"] becomes "apple, banana, and orange"
 * @param items - Array of strings to format into a list
 * @returns A formatted string with items joined according to locale conventions
 */
export function formatList(items: string[]) {
  return listFormatter.format(items);
}
