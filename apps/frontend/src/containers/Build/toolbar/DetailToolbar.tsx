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
    <div className="flex flex-wrap items-center justify-between gap-4">
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
 * What is on screen, named. Takes the space the controls leave and gives it
 * back — `min-w-0` so a long name truncates instead of pushing them off the row.
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
   * Terse facts about what is on screen, set beside its name and reading as an
   * extension of it — a file listing's second column, not a field.
   */
  meta?: React.ReactNode;
}) {
  const { children, render, className, meta } = props;
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
      className={clsx("flex min-w-0 flex-1", meta && "items-baseline gap-2")}
    >
      {render ? render(title) : title}
      {meta ? (
        <span className="text-low shrink-0 font-mono text-xs">{meta}</span>
      ) : null}
    </div>
  );
}
