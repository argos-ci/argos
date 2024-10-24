import { LinkIcon } from "lucide-react";

import { Chip, ChipProps } from "@/ui/Chip";
import { Link } from "@/ui/Link";

export function UrlIndicator(
  props: Omit<ChipProps, "ref"> & {
    url: string;
    isStorybook: boolean;
  },
) {
  const { url: propUrl, isStorybook, ...rest } = props;
  const url = isStorybook ? toStoryBookStoryUrl(propUrl) : propUrl;
  return (
    <Chip icon={LinkIcon} scale="xs" className="font-mono" {...rest}>
      <Link href={url} target="_blank">
        {url}
      </Link>
    </Chip>
  );
}

/**
 * Convert URL to Storybook story URL.
 */
function toStoryBookStoryUrl(input: string) {
  const urlObj = new URL(input);
  const id = urlObj.searchParams.get("id");
  if (!id) {
    return input;
  }
  const storyUrl = new URL(urlObj.origin);
  storyUrl.searchParams.set("path", `/story/${id}`);
  return storyUrl.toString();
}
