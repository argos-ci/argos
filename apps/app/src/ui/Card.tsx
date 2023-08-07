import { clsx } from "clsx";
import { HTMLProps } from "react";

type CardProps = HTMLProps<HTMLDivElement> & {
  intent?: "danger";
};

export const Card = ({ className, intent, ...props }: CardProps) => {
  return (
    <div
      className={clsx(
        className,
        "w-full overflow-hidden rounded border border-[--card-border] bg-app",
        intent === "danger"
          ? "[--card-border:theme(borderColor.danger.hover)] [--card-footer-bg:theme(backgroundColor.danger.ui)]"
          : "[--card-border:theme(borderColor.DEFAULT)]",
      )}
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
      className={clsx(
        "border-t border-[--card-border] bg-[--card-footer-bg,theme(backgroundColor.subtle)] p-4 text-sm",
        className,
      )}
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
  return <div className={clsx(className, "my-4 last:mb-0")} {...props} />;
};

export const CardSeparator = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={clsx(className, "border-t")}
      {...props}
    />
  );
};
