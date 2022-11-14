import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { memo } from "react";

import { Banner, Icon, Link } from "@/components";

export interface OvercapacityBannerProps {
  plan: { name: string } | null;
  consumptionRatio: number | null;
  ownerLogin: string;
}

export const OvercapacityBanner = memo(
  ({ plan, consumptionRatio, ownerLogin }: OvercapacityBannerProps) => {
    const visible = plan && consumptionRatio && consumptionRatio >= 0.9;

    if (!visible) {
      return null;
    }

    return (
      <Banner
        color={consumptionRatio >= 1 ? "danger" : "warning"}
        flex="0 0 auto"
      >
        <Icon as={ExclamationTriangleIcon} w={4} />
        You&apos;ve hit {Math.floor(consumptionRatio * 100)}% of the {plan.name}{" "}
        plan limit. <Link to={`/${ownerLogin}/settings`}>Upgrade plan</Link>
      </Banner>
    );
  }
);
