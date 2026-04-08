const PG_BIGINT_MIN = BigInt("-9223372036854775808");
const PG_BIGINT_MAX = BigInt("9223372036854775807");

/**
 * Check if the value is a valid big integer.
 */
export function isValidPgBigInt(value: string): boolean {
  if (value.trim() === "") {
    return false;
  }

  try {
    const bigInt = BigInt(value);
    return bigInt >= PG_BIGINT_MIN && bigInt <= PG_BIGINT_MAX;
  } catch {
    return false;
  }
}
