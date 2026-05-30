import clsx from "clsx";

export function Activity(props: {
  children: React.ReactNode;
  /**
   * Apply the default vertical gap between items. Disable it when the items
   * carry their own spacing (e.g. so a collapsing item can animate it away).
   * @default true
   */
  gap?: boolean;
}) {
  const { gap = true } = props;
  return (
    <div className="relative px-1">
      <div className="w-thin absolute top-1 bottom-0 left-[10.5px] bg-(--gray-6)" />
      <div className={clsx("relative text-xs", gap && "space-y-4")}>
        {props.children}
      </div>
    </div>
  );
}

export function ActivityItem(props: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("text-low relative pl-5.5", props.className)}>
      <div className="bg-subtle absolute top-0 left-0 flex h-4 items-center">
        {props.icon}
      </div>
      {props.children}
    </div>
  );
}
