import { createContext, use, type ComponentPropsWithRef } from "react";
import { clsx } from "clsx";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingContextValue = {
  level?: HeadingLevel;
  className?: string;
};

/**
 * Lets a layout set the level and the style of the headings inside it, so a
 * page's own markup says `<Heading>` and the surrounding layout decides whether
 * that is an `<h1>` or an `<h2>`. `PageHeader`, `EmptyState` and
 * `StandalonePage` all provide it.
 */
export const HeadingContext = createContext<HeadingContextValue>({});

/**
 * A heading whose level and style come from the layout it sits in.
 *
 * Defaults to `<h3>` with no styling of its own, which is what an unwrapped
 * heading rendered as before this replaced react-aria's.
 */
export function Heading({
  level,
  className,
  ...props
}: ComponentPropsWithRef<"h1"> & { level?: HeadingLevel }) {
  const context = use(HeadingContext);
  const Tag = `h${level ?? context.level ?? 3}` as `h${HeadingLevel}`;
  return (
    <Tag
      {...props}
      // `|| undefined` so an unstyled heading renders no attribute at all
      // rather than `class=""`.
      className={clsx(context.className, className) || undefined}
    />
  );
}
