import { Chip, ChipProps } from "@/ui/Chip";
import { Anchor } from "@/ui/Link";
import { LinkIcon } from "lucide-react";

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
