import { cloneElement } from "react";
import { MoreVerticalIcon } from "lucide-react";

import { IconButton } from "@/ui/IconButton";
import { Time } from "@/ui/Time";

export function ProviderCard(props: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-sm border p-4 text-sm">
      {props.children}
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
    <IconButton className="shrink-0">
      <MoreVerticalIcon />
    </IconButton>
  );
}
