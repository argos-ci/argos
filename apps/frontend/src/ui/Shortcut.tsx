import { clsx } from "clsx";

import { Kbd } from "./Kbd";
import { menuItemSuffixClassName } from "./menuStyle";

/**
 * How a shortcut is drawn, which depends on what surrounds it.
 *
 * - `text` — plain muted keys, for a menu. A menu is already a list of framed
 *   rows, and boxing the shortcut too gives every row a second thing to look
 *   at, competing with the words it annotates.
 * - `boxed` — keys in {@link Kbd}'s frames, for a tooltip, where the shortcut
 *   is one of only two things on screen and the frames read as keycaps rather
 *   than clutter.
 */
export type ShortcutVariant = "text" | "boxed";

/**
 * A keyboard shortcut, wherever it is shown.
 *
 * One component because the same shortcut used to render three ways depending
 * on where you read it. It still has two looks, but they are a choice now
 * rather than an accident — see {@link ShortcutVariant}.
 *
 * Keys are given one per element, so `["⌘", "E"]` rather than `"⌘E"`.
 */
export function Shortcut(props: {
  keys: readonly string[];
  variant?: ShortcutVariant;
  className?: string;
}) {
  const { keys, variant = "text", className } = props;
  if (keys.length === 0) {
    return null;
  }
  if (variant === "boxed") {
    return (
      <span className={clsx("flex shrink-0 items-center gap-0.5", className)}>
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </span>
    );
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
