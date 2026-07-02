/**
 * A piece of a formatted name list: either one of the original items or a
 * literal connector (", " / " and " / " and N others").
 */
export type NameListSegment<T> =
  | { type: "item"; item: T }
  | { type: "text"; text: string };

/**
 * Collapse a list into "A, B and N others" form, showing at most `max` items
 * (default 2) before summarizing the remainder. Returns segments so callers can
 * render the items as plain text or as components (e.g. user mentions); use
 * `formatNameListText` for the plain-string case.
 *
 * @example formatNameListText(["Alice", "Bob", "Carol", "Dan"]) // "Alice, Bob and 2 others"
 * @example formatNameListText(["Alice", "Bob"]) // "Alice and Bob"
 */
export function formatNameList<T>(
  items: readonly T[],
  options?: { max?: number },
): NameListSegment<T>[] {
  const max = Math.max(options?.max ?? 2, 1);
  const head = items.slice(0, max);
  const remaining = items.length - head.length;
  const segments: NameListSegment<T>[] = [];
  head.forEach((item, index) => {
    if (index > 0) {
      const isLast = index === head.length - 1;
      segments.push({
        type: "text",
        text: remaining === 0 && isLast ? " and " : ", ",
      });
    }
    segments.push({ type: "item", item });
  });
  if (remaining > 0) {
    segments.push({
      type: "text",
      text: ` and ${remaining} other${remaining > 1 ? "s" : ""}`,
    });
  }
  return segments;
}

/** {@link formatNameList} rendered as a plain string. */
export function formatNameListText(
  names: readonly string[],
  options?: { max?: number },
): string {
  return formatNameList(names, options)
    .map((segment) => (segment.type === "item" ? segment.item : segment.text))
    .join("");
}
