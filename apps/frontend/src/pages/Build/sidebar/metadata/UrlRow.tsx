import { LinkIcon } from "lucide-react";

import { ChipLink } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";
import { canParseURL } from "@/util/url";

import { MetadataRow } from "./MetadataRow";
import {
  resolvePreviewUrlFromDeployment,
  type AutomationLibrary,
} from "./utils";

export function UrlRow(props: {
  url: string | null;
  previewUrl: string | null;
  deploymentUrl: string | null;
  automationLibrary: AutomationLibrary | null;
}) {
  const { url, automationLibrary, deploymentUrl } = props;
  if (!url || !canParseURL(url)) {
    return null;
  }
  const isStorybook =
    automationLibrary?.name.startsWith("@storybook/") ?? false;
  const previewUrl =
    props.previewUrl ?? resolvePreviewUrlFromDeployment({ url, deploymentUrl });
  const formattedUrl = formatUrl({ url, isStorybook });
  const formattedPreviewUrl = previewUrl
    ? formatUrl({ url: previewUrl, isStorybook })
    : null;
  const href = formattedPreviewUrl ?? formattedUrl;
  return (
    <MetadataRow>
      <Tooltip
        content={
          formattedPreviewUrl ? (
            <>
              This is a preview URL. Screenshot was originally captured from:{" "}
              {formattedUrl}
            </>
          ) : (
            formattedUrl
          )
        }
      >
        <ChipLink icon={LinkIcon} href={href} target="_blank">
          {href}
        </ChipLink>
      </Tooltip>
    </MetadataRow>
  );
}

function formatUrl(input: { url: string; isStorybook: boolean }) {
  if (!input.isStorybook) {
    return input.url;
  }
  return toStorybookStoryUrl(input.url);
}

function toStorybookStoryUrl(input: string) {
  const urlObj = new URL(input);
  const id = urlObj.searchParams.get("id");
  if (!id) {
    return input;
  }
  const storyUrl = new URL(urlObj.origin);
  storyUrl.searchParams.set("path", `/story/${id}`);
  return storyUrl.toString();
}
