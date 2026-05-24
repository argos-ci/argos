import clsx from "clsx";

export function Activity(props: { children: React.ReactNode }) {
  return (
    <div className="relative px-1">
      <div className="w-thin absolute top-1 bottom-0 left-[10.5px] bg-(--mauve-6)" />
      <div className="relative space-y-3 text-xs">{props.children}</div>
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
