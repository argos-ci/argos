import { TagIcon } from "lucide-react";

import { Chip, type ChipProps } from "@/ui/Chip";

interface TagIndicatorProps extends Omit<
  ChipProps,
  "children" | "scale" | "icon"
> {
  tag: string;
}

export function TagIndicator(props: TagIndicatorProps) {
  const { tag, ...rest } = props;
  return (
    <Chip color="info" icon={TagIcon} scale="xs" {...rest}>
      {tag}
    </Chip>
  );
}
