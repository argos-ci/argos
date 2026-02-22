import memoize from "memoize";

export const numberFormatter = new Intl.NumberFormat();

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

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

const listFormatter = new Intl.ListFormat(undefined, {
  style: "long",
  type: "conjunction",
});

export function formatList(items: string[]) {
  return listFormatter.format(items);
}
