import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { memo } from "react";

import { Banner, Icon, Link } from "@/components";
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
