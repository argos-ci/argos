import { clsx } from "clsx";

import { menuItemSuffixClassName } from "./menuStyle";

/**
 * A keyboard shortcut on a menu row.
 *
 * Plain muted text rather than boxed keys: a menu is already a list of framed
 * rows, and a row of little boxes down its right edge competes with the words
 * it is meant to annotate. The boxed {@link Kbd} is still right where the keys
 * are the subject — the hotkeys dialog, the build summary's hints — rather
 * than a footnote to a command.
 *
 * Keys are given one per element, so `["⌘", "E"]` rather than `"⌘E"`.
 */
export function Shortcut(props: {
  keys: readonly string[];
  className?: string;
}) {
  const { keys, className } = props;
  if (keys.length === 0) {
    return null;
  }
  return (
    <span
      className={clsx(
        menuItemSuffixClassName,
        // `<kbd>` is monospace by default, which reads as a second typeface
        // next to the row's label.
        "flex items-center gap-1 [&>kbd]:font-sans",
        className,
      )}
    >
      {keys.map((key) => (
        <kbd key={key}>{key}</kbd>
      ))}
    </span>
  );
}
