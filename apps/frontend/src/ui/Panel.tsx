import clsx from "clsx";

/**
 * The surface that groups related content: a hairline edge, soft corners and a
 * shadow to lift it off the page. Shared with `Card`, so the panels in the build
 * sidebar and the cards in settings cannot drift apart.
 *
 * @param elevation Shadow depth: 1 (default) casts a subtle shadow, 0 is flat.
 */
export function getSurfaceClassName(options?: { elevation?: 0 | 1 }): string {
  const { elevation = 1 } = options ?? {};
  return clsx("bg-app border-thin rounded-xl", elevation === 1 && "shadow-xs");
}

/**
 * A bordered surface grouping related content. Used for the cards in the build
 * sidebar and overview.
 */
export function Panel(props: {
  children: React.ReactNode;
  className?: string;
  /** Shadow depth: 1 (default) casts a subtle shadow, 0 is flat. */
  elevation?: 0 | 1;
  spacing?: boolean;
}) {
  const { children, className, elevation = 1, spacing = true } = props;
  return (
    <div
      className={clsx(
        getSurfaceClassName({ elevation }),
        spacing && "py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Top row of a panel: its title on the left, optional actions on the right. */
export function PanelHeader(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const { children, className } = props;
  return (
    <div
      className={clsx(
        // The row is exactly one title line tall whatever it carries: an
        // action button taller than the text centers on the title and
        // overflows the row, instead of pushing the title down and making
        // this panel's top padding read bigger than its neighbours'.
        "flex h-5 shrink-0 items-center justify-between gap-4 px-4 pr-3",
        // The default spacing suits the denser sidebar; main-area panels pass a
        // tighter margin (e.g. `mb-2`) through className.
        className ?? "mb-3",
      )}
    >
      {children}
    </div>
  );
}

/** Heading of a panel, with an optional leading icon. */
export function PanelTitle(props: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  const { children, className, icon: Icon } = props;
  return (
    <h2
      className={clsx(
        "text-low flex items-center gap-1.5 text-sm font-medium",
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" strokeWidth={1.75} /> : null}
      {children}
    </h2>
  );
}
