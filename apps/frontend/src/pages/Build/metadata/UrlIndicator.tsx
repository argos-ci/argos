import { LinkIcon } from "lucide-react";

import { Chip, ChipProps } from "@/ui/Chip";
import { Link } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";

export function UrlIndicator(
  props: Omit<ChipProps, "ref"> & {
    url: string;
    previewUrl: string | null;
    isStorybook: boolean;
  },
) {
  const {
    url: propUrl,
    previewUrl: propPreviewUrl,
    isStorybook,
    ...rest
  } = props;

  const url = formatUrl({ url: propUrl, isStorybook });
  const previewUrl = propPreviewUrl
    ? formatUrl({ url: propPreviewUrl, isStorybook })
    : null;
  const href = previewUrl || url;

  return (
    <Tooltip
      content={
        previewUrl ? (
          <>
            This is a preview URL. Screenshot was originally captured from:{" "}
            {url}
          </>
        ) : null
      }
    >
      <Chip icon={LinkIcon} scale="xs" className="font-mono" {...rest}>
        <Link href={href} target="_blank">
          {href}
        </Link>
      </Chip>
    </Tooltip>
  );
}

/**
 * Format URL based on the metadata.
 */
function formatUrl(input: { url: string; isStorybook: boolean }) {
  if (!input.isStorybook) {
    return input.url;
  }
  return toStoryBookStoryUrl(input.url);
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
