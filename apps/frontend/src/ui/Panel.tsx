import clsx from "clsx";

/**
 * A bordered surface grouping related content. Used for the cards in the build
 * sidebar and overview.
 */
export function Panel(props: {
  children: React.ReactNode;
  className?: string;
  /** Shadow depth: 1 (default) casts a subtle shadow, 0 is flat. */
  elevation?: 0 | 1;
}) {
  const { children, className, elevation = 1 } = props;
  return (
    <div
      className={clsx(
        "bg-app border-thin rounded-xl py-3",
        elevation === 1 && "shadow-xs",
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
        "flex shrink-0 items-center justify-between gap-4 px-4 pr-3",
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
