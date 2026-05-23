import clsx from "clsx";

export function Sidebar(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <div className="flex min-h-0 max-w-80 flex-1 flex-col gap-2 overflow-y-auto py-2 pr-2 empty:hidden">
      {children}
    </div>
  );
}

export function SidebarSection(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const { children, className } = props;
  return (
    <div
      className={clsx(
        "bg-app border-thin rounded-md py-3 shadow-xs",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarHeader(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const { children, className } = props;
  return (
    <div
      className={clsx(
        "mb-2.5 flex shrink-0 items-baseline justify-between gap-4 px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarHeading(props: { children: React.ReactNode }) {
  const { children } = props;
  return <h2 className="text-low text-sm font-medium">{children}</h2>;
}
