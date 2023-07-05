import { clsx } from "clsx";

export const Container = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={clsx(className, "container mx-auto px-4 sm:px-8 max-w-5xl")}
      {...props}
    />
  );
};
