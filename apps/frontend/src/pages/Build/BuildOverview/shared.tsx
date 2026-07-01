import { clsx } from "clsx";
import { GitBranch } from "lucide-react";

import { Code } from "@/ui/Code";

/** Bolded inline text used to highlight a phrase within a sentence. */
export function Emphasis(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <strong className={clsx("font-medium", props.className)}>
      {props.children}
    </strong>
  );
}

/**
 * A branch name rendered as a chip with a git-branch icon, or a plain-text
 * fallback when the name is unknown.
 */
export function BranchTag(props: { name: string | null; fallback: string }) {
  return props.name ? (
    <Code className="whitespace-nowrap">
      <GitBranch className="mr-1 inline h-4 w-4" />
      {props.name}
    </Code>
  ) : (
    <>{props.fallback}</>
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
