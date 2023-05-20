import { clsx } from "clsx";
import { HTMLProps } from "react";

export const Card = ({ className, ...props }: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      className={clsx(
        className,
        "w-full rounded-xl border border-border bg-slate-900/50"
      )}
      {...props}
    />
  );
};

export const CardBody = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return <div className={clsx(className, "font-ms p-4")} {...props} />;
};

export const CardFooter = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      className={clsx(className, "bg-slate-900/70 p-4 text-sm")}
      {...props}
    />
  );
};

export const CardTitle = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <h2 className={clsx(className, "mb-2 text-xl font-semibold")} {...props} />
  );
};

export const CardParagraph = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return <p className={clsx(className, "my-2 last-of-type:mb-0")} {...props} />;
};

export const CardSeparator = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={clsx(className, "border-t border-t-menu-border")}
      {...props}
    />
  );
};
