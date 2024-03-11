import { Chip, ChipProps } from "@/ui/Chip";
import { Anchor } from "@/ui/Anchor";
import { LinkIcon } from "lucide-react";

export function UrlIndicator({
  url,
  ...props
}: Omit<ChipProps, "ref"> & {
  url: string;
}) {
  return (
    <Chip icon={LinkIcon} scale="xs" className="font-mono" {...props}>
      <Anchor
        external
        href={url}
        className="inline-block text-ellipsis overflow-hidden"
      >
        {url}
      </Anchor>
    </Chip>
  );
}
