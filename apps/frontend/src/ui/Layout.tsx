import { ComponentPropsWithRef } from "react";
import clsx from "clsx";

import { Container, type ContainerProps } from "./Container";
import { HeadingContext } from "./Heading";
import { Link } from "./Link";
import { TextContext } from "./Text";

export function PageHeader(props: ComponentPropsWithRef<"div">) {
  return (
    <HeadingContext value={{ level: 1, className: "text-2xl font-medium" }}>
      <TextContext
        value={{ slots: { headline: { className: "text-low text-sm" } } }}
      >
        <div
          {...props}
          className={clsx(
            "mb-6 flex items-end justify-between gap-x-4",
            props.className,
          )}
        />
      </TextContext>
    </HeadingContext>
  );
}

export function PageHeaderContent(props: ComponentPropsWithRef<"div">) {
  return <div {...props} />;
}

export function PageHeaderActions(props: ComponentPropsWithRef<"div">) {
  return <div {...props} className={clsx("flex gap-4", props.className)} />;
}

export function PageContainer(props: ComponentPropsWithRef<"div">) {
  return (
    <Container
      {...props}
      className={clsx("flex flex-1 flex-col py-10", props.className)}
    />
  );
}

export function EmptyState(props: ComponentPropsWithRef<"div">) {
  return (
    <HeadingContext value={{ level: 2, className: "font-medium text-base" }}>
      <TextContext
        value={{
          slots: {
            description: {
              // A fixed measure keeps the description readable and gives every
              // empty state the same silhouette, whatever its copy length.
              className: "text-low max-w-lg text-center text-sm text-balance",
            },
          },
        }}
      >
        <Container
          {...props}
          className={clsx(
            "flex flex-col items-center justify-center gap-1 py-10",
            props.className,
          )}
        />
      </TextContext>
    </HeadingContext>
  );
}

export function EmptyStateIcon(props: ComponentPropsWithRef<"div">) {
  return (
    <div {...props} className={clsx("relative mb-4 p-8", props.className)}>
      <div className="border-primary absolute inset-8 rounded-full border opacity-100" />
      <div className="border-primary absolute inset-5 rounded-full border opacity-80" />
      <div className="border-primary absolute inset-2 rounded-full border opacity-50" />
      <div className="border-primary absolute -inset-1 rounded-full border opacity-20" />
      <div className="ring-default text-primary-low relative z-10 rounded-full p-4 [&>svg]:size-6">
        {props.children}
      </div>
    </div>
  );
}

/**
 * Slot for a feature illustration at the top of an empty state. Unlike
 * {@link EmptyStateIcon} it draws no frame of its own — the illustration
 * carries the visual weight.
 */
export function EmptyStateIllustration(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx("mb-5 w-full max-w-[200px]", props.className)}
      aria-hidden="true"
    />
  );
}

/**
 * Row of short "how it works" cards, for empty states that have to teach the
 * feature rather than just report that there is nothing to show.
 *
 * Widest element of the empty state, one step down from the page container, so
 * the block reads as illustration → prose → structure rather than three
 * unrelated widths.
 */
export function EmptyStateSteps(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "mt-7 grid w-full max-w-5xl gap-3 text-left sm:grid-cols-3",
        props.className,
      )}
    />
  );
}

export function EmptyStateStep(props: {
  icon: React.ReactNode;
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  const { icon, step, title, children } = props;
  return (
    <div className="bg-app border-thin flex flex-col gap-2 rounded-lg p-5 shadow-xs">
      {/* The eyebrow names *when* in the workflow this happens, so the three
          cards read as the sequence they are. Accent stays on the icon: one
          coloured mark per card. */}
      <div className="text-low flex items-center gap-2 text-xs font-medium">
        <span aria-hidden="true" className="text-primary-low [&>svg]:size-3.5">
          {icon}
        </span>
        {step}
      </div>
      {/* A plain `h3`: the surrounding `EmptyState` provides a `HeadingContext`
          sized for its own title. */}
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="text-low text-sm leading-relaxed text-pretty">
        {children}
      </div>
    </div>
  );
}

export function EmptyStateActions(props: ComponentPropsWithRef<"div">) {
  return (
    <div {...props} className={clsx("mt-6 flex gap-3", props.className)} />
  );
}

/**
 * Documentation link for an empty state, sitting under the actions. Kept as a
 * link rather than a second button so the real action stays the only thing
 * competing for attention.
 */
export function EmptyStateLearnMore(props: {
  href: string;
  children?: string;
}) {
  return (
    <Link external href={props.href} className="mt-4 text-sm" target="_blank">
      {props.children ?? "Learn more"}
    </Link>
  );
}

export function Page(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "bg-subtle flex min-h-0 flex-1 flex-col",
        props.className,
      )}
    />
  );
}

/**
 * Layout to use for standalone page like signup.
 */
export function StandalonePage(props: ContainerProps) {
  return (
    <HeadingContext
      value={{
        level: 1,
        className:
          "mx-auto text-balance text-center text-2xl font-semibold leading-tight",
      }}
    >
      <Container
        {...props}
        className={clsx(
          "flex min-h-0 flex-1 flex-col items-center pt-16 pb-4",
          props.className,
        )}
      />
    </HeadingContext>
  );
}
