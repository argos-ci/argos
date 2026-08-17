import { clsx } from "clsx";

import { Kbd } from "./Kbd";

/**
 * A keyboard shortcut, wherever it is shown.
 *
 * One component because the same shortcut used to render three ways depending
 * on where you read it: plain text on a menu row, boxed keys in the editor's
 * slash menu, and boxed keys again — with different spacing — in a hotkey
 * tooltip. Keys are given one per box, so `["⌘", "E"]` rather than `"⌘E"`.
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
    <span className={clsx("flex shrink-0 items-center gap-0.5", className)}>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </span>
  );
}
