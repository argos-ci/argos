import clsx from "clsx";

import { BrandShield } from "@/ui/BrandShield";
import { Tooltip } from "@/ui/Tooltip";

export function SdkIndicator({
  sdk,
  className,
}: {
  className?: string;
  sdk: {
    name: string;
    version: string;
  };
}) {
  return (
    <Tooltip content={`${sdk.name} v${sdk.version}`}>
      <div className={clsx("flex", className)}>
        <BrandShield />
      </div>
    </Tooltip>
  );
}
