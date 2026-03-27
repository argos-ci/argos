import clsx from "clsx";

export const StoryTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h2 className={clsx("mt-6 mb-2 text-lg font-bold first:mt-0", className)}>
    {children}
  </h2>
);
