import type { ButtonProps as AriakitButtonProps } from "ariakit/button";
import { clsx } from "clsx";
import { HTMLProps, forwardRef, memo } from "react";

import { Button } from "@/ui/Button";
import type { ButtonColor } from "@/ui/Button";
import { Loader, useDelayedVisible } from "@/ui/Loader";

export const ListLoader = memo(() => {
  const visible = useDelayedVisible(500);
  if (!visible) return null;
  return (
    <>
      <Loader size={24} delay={0} />
      <span>Fetching...</span>
    </>
  );
});

export const ListHeaders = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      className={clsx(
        "flex h-11 items-center gap-4 border-b border-b-border bg-slate-900 px-4 py-2 text-sm",
        className
      )}
      {...props}
    />
  );
};

export const ListHeader = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      className={clsx(
        "flex whitespace-nowrap font-medium uppercase",
        className
      )}
      {...props}
    />
  );
};

export type ListProps = HTMLProps<HTMLDivElement>;
export const List = ({ className, ...props }: ListProps) => {
  return (
    <div
      className={clsx("flex flex-col rounded border border-border", className)}
      {...props}
    />
  );
};

export type ListRowProps = HTMLProps<HTMLDivElement>;
export const ListRow = ({ className, ...props }: ListRowProps) => {
  return (
    <div
      className={clsx(
        "flex items-center gap-4 border-b border-b-border px-4 py-2 text-sm last:border-b-0",
        className
      )}
      {...props}
    />
  );
};

export const ListCell = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      className={clsx(
        "flex h-16 items-center justify-end whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
};

interface ListHeaderButtonProps
  extends Omit<AriakitButtonProps<"button">, "className" | "children"> {
  children: React.ReactNode;
  color?: ButtonColor;
  icon?: React.ComponentType<any> | null;
}

export const ListHeaderButton = forwardRef<
  HTMLButtonElement,
  ListHeaderButtonProps
>(({ children, icon: Icon, color = "neutral", ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="outline"
      color={color}
      size="small"
      className="flex items-center"
      {...props}
    >
      {Icon && <Icon className="mr-2 h-[1em] w-[1em] shrink-0" />}
      {children}
    </Button>
  );
});
