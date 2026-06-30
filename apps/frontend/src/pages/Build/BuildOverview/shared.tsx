import { clsx } from "clsx";

import type { UIColor } from "@/util/colors";

/** Background tints for the status discs, keyed by UI color. */
export const uiBgColorClassNames: Record<UIColor, string> = {
  primary: "bg-primary-ui",
  info: "bg-info-ui",
  success: "bg-success-ui",
  storybook: "bg-storybook-ui",
  neutral: "bg-ui",
  pending: "bg-pending-ui",
  danger: "bg-danger-ui",
  warning: "bg-warning-ui",
};

/** Bolded inline text used to highlight a phrase within a sentence. */
export function Emphasis(props: { children: React.ReactNode }) {
  return <strong className="font-medium">{props.children}</strong>;
}

/**
 * A single metric — icon, large number, caption — shared by the review-scope
 * and verified-coverage blocks. The container controls layout (grid cell,
 * divided row…) via `className`.
 */
export function Stat(props: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1", props.className)}>
      <props.icon className="text-primary-low size-5" strokeWidth={1.5} />
      <div className="text-default mt-0.5 text-lg leading-none font-bold tabular-nums">
        {props.value}
      </div>
      <div className="text-low text-xs">{props.label}</div>
    </div>
  );
}

/** A numbered step in a guidance list, with a circled index and content. */
export function GuidanceStep(props: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="bg-info-ui text-info-low flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
        {props.index}
      </span>
      <span className="min-w-0 flex-1 text-balance">{props.children}</span>
    </li>
  );
}

/** Bold title heading a single guidance step. */
export function GuidanceStepTitle(props: { children: React.ReactNode }) {
  return <div className="mb-1 font-bold">{props.children}</div>;
}

/** Small uppercase label introducing a flat section, in the brand accent. */
export function SectionHeader(props: {
  children: React.ReactNode;
  className?: string;
  noMargin?: boolean;
}) {
  return (
    <h2
      className={clsx(
        "text-primary-low text-xs font-bold tracking-wider uppercase",
        { "mb-4": !props.noMargin },
        props.className,
      )}
    >
      {props.children}
    </h2>
  );
}
