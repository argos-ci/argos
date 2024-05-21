import { LinkIcon } from "lucide-react";

import { Chip, ChipProps } from "@/ui/Chip";
import { Link } from "@/ui/Link";

export function UrlIndicator({
  url,
  ...props
}: Omit<ChipProps, "ref"> & {
  url: string;
}) {
  return (
    <Chip icon={LinkIcon} scale="xs" className="font-mono" {...props}>
      <Link href={url} target="_blank">
        {url}
      </Link>
    </Chip>
  );
}
