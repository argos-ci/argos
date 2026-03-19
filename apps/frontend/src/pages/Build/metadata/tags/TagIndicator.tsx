import { TagIcon } from "lucide-react";

import { Chip, type ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export const TagSource = {
  snapshot: "snapshot",
  test: "test",
} as const;

export type TagSource = keyof typeof TagSource;

export type TagWithSource = {
  name: string;
  source: TagSource;
};

type TagIndicatorProps = Omit<
  ChipProps,
  "children" | "scale" | "icon" | "color"
> & {
  name: string;
  source: TagSource;
};

const TAG_SOURCE_META: Record<
  TagSource,
  { color: ChipProps["color"]; tooltip: string }
> = {
  test: { color: "primary", tooltip: "Test tag" },
  snapshot: { color: "info", tooltip: "Snapshot tag" },
};

export function TagIndicator({ name, source, ...rest }: TagIndicatorProps) {
  const meta = TAG_SOURCE_META[source];

  return (
    <Tooltip content={meta.tooltip}>
      <Chip color={meta.color} icon={TagIcon} scale="xs" {...rest}>
        {name}
      </Chip>
    </Tooltip>
  );
}
