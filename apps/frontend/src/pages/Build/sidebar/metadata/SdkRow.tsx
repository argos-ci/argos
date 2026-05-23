import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import { CloudDownloadIcon, PackageXIcon } from "lucide-react";

import type { ScreenshotMetadataSdk } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Chip, ChipLink } from "@/ui/Chip";
import { Tooltip, TooltipContainer, TooltipHeader } from "@/ui/Tooltip";

import { MetadataRow } from "./MetadataRow";

export function SdkRow(props: { sdk: ScreenshotMetadataSdk | null }) {
  const { sdk } = props;
  if (!sdk) {
    return null;
  }
  if (sdk.latestVersion) {
    const changelogUrl = `https://github.com/argos-ci/argos-javascript/releases/tag/${sdk.name}@${sdk.latestVersion}`;
    return (
      <MetadataRow>
        <Tooltip
          disableHoverableContent={false}
          content={
            <TooltipContainer>
              <TooltipHeader icon={CloudDownloadIcon}>
                New SDK version available
              </TooltipHeader>
              <p>
                You’re using{" "}
                <strong className="font-medium">
                  {sdk.name} v{sdk.version}
                </strong>
                .
              </p>
              <p>
                Upgrade to{" "}
                <strong className="font-medium">v{sdk.latestVersion}</strong>{" "}
                for the latest fixes and features.{" "}
              </p>
              <a href={changelogUrl} className="underline-link">
                View changelog
              </a>
            </TooltipContainer>
          }
        >
          <ChipLink href={changelogUrl} target="_blank" icon={PackageXIcon}>
            SDK Outdated
          </ChipLink>
        </Tooltip>
      </MetadataRow>
    );
  }
  return (
    <MetadataRow>
      <Chip icon={<BrandShieldIcon />}>
        {sdk.name}
        <span className="text-low ml-1">v{sdk.version}</span>
      </Chip>
    </MetadataRow>
  );
}

function BrandShieldIcon(props: ComponentPropsWithRef<"div">) {
  return (
    <div {...props} className={clsx("flex", props.className)}>
      <BrandShield />
    </div>
  );
}
