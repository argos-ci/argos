import { clsx } from "clsx";

/**
 * The row over whatever is being looked at: where it goes back and forward, what
 * it is, and what can be done to it.
 *
 * One component because it is one bar — a build's snapshot and a shared media
 * are different subjects with the same handling, and a reviewer moving between
 * them should not have to find the arrows twice. The slots below are the parts
 * that have to line up; everything else is passed in.
 */
export function DetailToolbar(props: { children: React.ReactNode }) {
  return (
    // A tighter gap between rows than along one: side by side the slots are
    // separate things and read as such, but stacked they are one bar folded
    // over, and a row's worth of air makes it look like two.
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      {props.children}
    </div>
  );
}

/**
 * The arrows, leftmost. `shrink-0` because they are the one thing in the row
 * that must never be the part that wraps or collapses — a bar too narrow for
 * everything still navigates.
 */
export function DetailToolbarNav(props: { children: React.ReactNode }) {
  return <div className="flex shrink-0 gap-1">{props.children}</div>;
}

/**
 * What is on screen, named. Takes the space the rest of the row leaves and
 * gives it back, so a long name clamps to two lines rather than pushing
 * anything off.
 *
 * A flex line is broken up on base sizes, which is the whole of how this row
 * behaves. The name is based on itself rather than on the `flex-1` (`basis: 0`)
 * this used to be: at zero it counted for nothing when the row decided what fit,
 * so it never wrapped on its own account and took whatever the rest left —
 * beside a full set of variant chips, two crushed syllables. Asking for its own
 * length instead means the row breaks only when the name really needs the room,
 * and a short one leaves everything else alone. See `crowded` for the other
 * half of it.
 *
 * `heading` rather than an `h1` element: the slot is used on pages that already
 * have one, and the level is stated explicitly rather than inferred.
 */
export function DetailToolbarTitle(props: {
  children: React.ReactNode;
  /** Wraps the title — a link to wherever the subject came from. */
  render?: (title: React.ReactNode) => React.ReactNode;
  className?: string;
  /**
   * Whether the row carries something besides the name and its controls — the
   * variant chips, on a build.
   *
   * Then the name's ask is capped: left to ask for its full length, a long one
   * takes the line to itself and folds *everything* else underneath, chips and
   * controls together. Capped, it asks for a couple of lines' worth, which
   * leaves the controls their place on the first row and lets only the chips
   * drop. It still grows past the cap into whatever the row does not use.
   */
  crowded?: boolean;
}) {
  const { children, render, className, crowded } = props;
  const title = (
    <span
      role="heading"
      aria-level={1}
      className={clsx("line-clamp-2 text-sm font-medium", className)}
    >
      {children}
    </span>
  );
  return (
    <div
      className={clsx(
        "flex min-w-0 shrink grow",
        crowded ? "basis-72" : "basis-auto",
      )}
    >
      {render ? render(title) : title}
    </div>
  );
}
