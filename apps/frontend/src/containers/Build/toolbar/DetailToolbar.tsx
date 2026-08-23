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
    //
    // `justify-end` decides one case only — a slot wrapped onto a line of its
    // own, which belongs on the right where it came from. Everywhere else the
    // title's `grow` has already spent the free space.
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
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
 * Based on its own length rather than the `flex-1` (`basis: 0`) this used to
 * be: a flex line is broken up on base sizes, and at zero the name counted for
 * nothing when the row decided what fit — it never wrapped anything on its own
 * account and took whatever the rest left, which beside a full set of variant
 * switchers was two crushed syllables.
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
   * Whether the row carries something built to give way — the build's variant
   * cluster, which folds its switchers under the controls when squeezed.
   *
   * Then the name trades its full ask for a firm floor: it never shrinks below
   * a couple of lines' worth, and the cluster is what folds first — asking for
   * everything instead would push the whole cluster down even when the name
   * fits beside it. It still grows into whatever the cluster does not use.
   * Without a cluster there is nothing designed to yield, so the name asks for
   * its own length and shrinks like anything else.
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
        "flex grow",
        crowded ? "shrink-0 basis-72" : "min-w-0 shrink basis-auto",
      )}
    >
      {render ? render(title) : title}
    </div>
  );
}
