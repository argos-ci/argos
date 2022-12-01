import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { memo } from "react";

import { Link } from "@/modern/ui/Link";
import { Banner } from "@/modern/ui/Banner";
import { graphql } from "@/gql";

import { FragmentType, useFragment } from "@/gql/fragment-masking";

export const OwnerFragment = graphql(`
  fragment OvercapacityBanner_Owner on Owner {
    plan {
      name
    }
    consumptionRatio
  }
`);

export const OvercapacityBanner = memo(
  (props: {
    ownerLogin: string;
    owner: FragmentType<typeof OwnerFragment>;
  }) => {
    const { ownerLogin } = props;
    const owner = useFragment(OwnerFragment, props.owner);
    const { plan, consumptionRatio } = owner;
    const visible =
      plan && typeof consumptionRatio === "number" && consumptionRatio >= 0.9;

    if (!visible) {
      return null;
    }

    return (
      <Banner
        className="flex flex-shrink-0 items-center justify-center gap-2"
        color={consumptionRatio >= 1 ? "danger" : "warning"}
      >
        <ExclamationTriangleIcon className="h-4 w-4" />
        <span>
          You&apos;ve hit {Math.floor(consumptionRatio * 100)}% of the{" "}
          {plan.name} plan limit.
        </span>
        <Link to={`/${ownerLogin}/settings`}>Upgrade plan</Link>
      </Banner>
    );
  }
);
