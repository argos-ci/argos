import { BrandShield } from "@/ui/BrandShield";
import { Tooltip } from "@/ui/Tooltip";

export function SdkIndicator({
  sdk,
  ...props
}: {
  className?: string;
  sdk: {
    name: string;
    version: string;
  };
}) {
  return (
    <Tooltip content={`${sdk.name} v${sdk.version}`}>
      <BrandShield {...props} />
    </Tooltip>
  );
}
