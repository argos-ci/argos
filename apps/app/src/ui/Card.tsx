import { clsx } from "clsx";
import { HTMLProps } from "react";

export const Card = (props: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      className="w-full overflow-hidden rounded border border-border bg-slate-900/50"
      {...props}
    />
  );
};

export const CardBody = (props: HTMLProps<HTMLDivElement>) => {
  return <div className="font-ms p-4" {...props} />;
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

export const CardTitle = (props: HTMLProps<HTMLDivElement>) => {
  return <h2 className="mb-4 text-xl font-semibold" {...props} />;
};

export const CardParagraph = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return <p className={clsx(className, "my-4 last-of-type:mb-0")} {...props} />;
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
