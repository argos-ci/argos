import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import { CloudDownloadIcon } from "lucide-react";

import type { ScreenshotMetadataSdk } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Chip } from "@/ui/Chip";
import { Tooltip, TooltipContainer, TooltipHeader } from "@/ui/Tooltip";

export function SdkIndicator({
  sdk,
  className,
}: {
  className?: string;
  sdk: ScreenshotMetadataSdk;
}) {
  const version = `${sdk.name} v${sdk.version}`;
  if (sdk.latestVersion) {
    return (
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
              <strong className="font-medium">v{sdk.latestVersion}</strong> for
              the latest fixes and features.{" "}
            </p>
            <a
              href={`https://github.com/argos-ci/argos-javascript/releases/tag/${sdk.name}@${sdk.latestVersion}`}
              className="underline-link"
            >
              View changelog
            </a>
          </TooltipContainer>
        }
      >
        <Chip color="primary" scale="xs" icon={<BrandShieldIcon />}>
          Update
        </Chip>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={version}>
      <BrandShieldIcon className={className} />
    </Tooltip>
  );
}

function BrandShieldIcon(props: ComponentPropsWithRef<"div">) {
  return (
    <div {...props} className={clsx("flex", props.className)}>
      <BrandShield />
    </div>
  );
}
