import { LinkIcon } from "lucide-react";

import { Anchor } from "@/ui/Anchor";
import { Chip, ChipProps } from "@/ui/Chip";

export function UrlIndicator({
  url,
  ...props
}: Omit<ChipProps, "ref"> & {
  url: string;
}) {
  return (
    <Chip icon={LinkIcon} scale="xs" className="font-mono" {...props}>
      <Anchor external href={url}>
        {url}
      </Anchor>
    </Chip>
  );
}
