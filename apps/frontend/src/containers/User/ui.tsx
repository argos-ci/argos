import { cloneElement } from "react";
import { MoreVerticalIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { Time } from "@/ui/Time";

export function ProviderCard(props: {
  children: React.ReactNode;
  /**
   * Rows revealed below the card's header, for a provider that holds more than
   * one credential (see the passkey list).
   */
  body?: React.ReactNode;
  /**
   * Accessible name for the card. Worth setting when it holds more than a
   * single row, so the header and its rows are announced as one group.
   */
  label?: string;
}) {
  return (
    <div
      className="rounded-sm border text-sm"
      {...(props.label ? { role: "group", "aria-label": props.label } : {})}
    >
      <div className="flex items-center gap-4 p-4">{props.children}</div>
      {props.body}
    </div>
  );
}

export function ProviderIcon(props: {
  children: React.ReactElement<{ className?: string }>;
}) {
  return cloneElement(props.children, { className: "size-6 shrink-0" });
}

export function ProviderContent(props: { children: React.ReactNode }) {
  return <div className="flex-1">{props.children}</div>;
}

export function ProviderLastLoggedAt(props: { date: string }) {
  return (
    <div>
      Connected <Time date={props.date} />
    </div>
  );
}

export function ProviderMenuButton() {
  return (
    <Button variant="ghost" iconOnly className="shrink-0">
      <MoreVerticalIcon />
    </Button>
  );
}
