import {
  createParser,
  parseAsArrayOf,
  type GenericParser,
  type SingleParser,
  type SingleParserBuilder,
  type Values,
} from "nuqs";

/**
 * A comma-separated list of items.
 * Items are URI-encoded for safety, so they may not look nice in the URL.
 *
 * @param itemParser Parser for each individual item in the set
 * @param separator The character to use to separate items (default ',')
 */
export function parseAsSetOf<ItemType>(
  itemParser: SingleParser<ItemType>,
  separator = ",",
): SingleParserBuilder<Set<ItemType>> {
  const arrayParser = parseAsArrayOf(itemParser, separator);
  return createParser({
    parse: (value) => {
      const arr = arrayParser.parse(value);
      return new Set(arr);
    },
    serialize: (values) => {
      return arrayParser.serialize(Array.from(values));
    },
    eq: (a, b) => {
      if (a === b) {
        return true;
      }
      if (a.size !== b.size) {
        return false;
      }
      return Array.from(a).every((value) => b.has(value));
    },
  });
}

/**
 * Check if values are the default one using a schema.
 */
export function checkAreDefaultValues<
  T extends Record<string, GenericParser<any>>,
>(schema: T, values: Values<T>) {
  return Object.entries(schema).every(([key, parser]) => {
    const value = values[key];
    const defaultValue = "defaultValue" in parser ? parser.defaultValue : null;
    if (defaultValue === null) {
      return value === null;
    }
    const eq = parser.eq ?? Object.is;
    return eq(defaultValue, value);
  });
}
