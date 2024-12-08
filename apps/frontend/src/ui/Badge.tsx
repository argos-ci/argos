import { clsx } from "clsx";

interface BadgeProps {
  ref?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ ref, children, className = "" }: BadgeProps) {
  return (
    <div
      ref={ref}
      className={clsx(
        className,
        "text-xxs text-low rounded-md border px-2 py-0.5 font-semibold tabular-nums leading-none",
      )}
    >
      {children}
    </div>
  );
}
