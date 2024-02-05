import { AlertTriangleIcon } from "lucide-react";

import { memo } from "react";

import { graphql } from "@/gql";
import { FragmentType, useFragment } from "@/gql/fragment-masking";
import { Banner } from "@/ui/Banner";
import { Link } from "@/ui/Link";

const AccountFragment = graphql(`
  fragment OvercapacityBanner_Account on Account {
    plan {
      id
      displayName
      usageBased
    }
    consumptionRatio
  }
`);

export const OvercapacityBanner = memo(
  (props: {
    accountSlug: string;
    account: FragmentType<typeof AccountFragment>;
  }) => {
    const { accountSlug } = props;
    const account = useFragment(AccountFragment, props.account);
    const { plan, consumptionRatio } = account;
    const visible = plan && !plan.usageBased && consumptionRatio >= 0.9;
    if (!visible) {
      return null;
    }

    return (
      <Banner
        className="flex shrink-0 items-center justify-center gap-2 border-b"
        color={consumptionRatio >= 1 ? "danger" : "warning"}
      >
        <AlertTriangleIcon className="h-4 w-4" />
        <span>
          You&apos;ve hit {Math.floor(consumptionRatio * 100)}% of the{" "}
          {plan.displayName} plan limit.
        </span>
        <Link to={`/${accountSlug}/settings`}>Upgrade plan</Link>
      </Banner>
    );
  },
);
