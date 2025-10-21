import { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import { HeadingContext, Provider, TextContext } from "react-aria-components";

import { Container, type ContainerProps } from "./Container";

export function PageHeader(props: ComponentPropsWithRef<"div">) {
  return (
    <Provider
      values={[
        [HeadingContext, { level: 1, className: "text-2xl font-medium" }],
        [
          TextContext,
          {
            slots: {
              headline: { className: "text-low text-sm" },
            },
          },
        ],
      ]}
    >
      <div
        {...props}
        className={clsx(
          "mb-6 flex items-end justify-between gap-x-4",
          props.className,
        )}
      />
    </Provider>
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
    <Provider
      values={[
        [HeadingContext, { level: 2, className: "font-medium text-base" }],
        [
          TextContext,
          {
            slots: {
              description: { className: "text-low text-sm text-center" },
            },
          },
        ],
      ]}
    >
      <Container
        {...props}
        className={clsx(
          "flex flex-col items-center justify-center gap-1 py-10",
          props.className,
        )}
      />
    </Provider>
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

export function EmptyStateActions(props: ComponentPropsWithRef<"div">) {
  return (
    <div {...props} className={clsx("mt-2 flex gap-4 p-4", props.className)} />
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
    <Provider
      values={[
        [
          HeadingContext,
          {
            level: 1,
            className:
              "mx-auto text-balance text-center text-2xl font-semibold leading-tight",
          },
        ],
      ]}
    >
      <Container
        {...props}
        className={clsx(
          "flex min-h-0 flex-1 flex-col items-center pt-16 pb-4",
          props.className,
        )}
      />
    </Provider>
  );
}
