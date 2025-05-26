import { memo } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { Banner } from "@/ui/Banner";
import { Link } from "@/ui/Link";

import { getAccountURL } from "../Account/AccountParams";

const _AccountFragment = graphql(`
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
    account: DocumentType<typeof _AccountFragment>;
  }) => {
    const { accountSlug, account } = props;
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
        <AlertTriangleIcon className="size-4" />
        <span>
          You&apos;ve hit {Math.floor(consumptionRatio * 100)}% of the{" "}
          {plan.displayName} plan limit.
        </span>
        <Link href={`${getAccountURL({ accountSlug })}/settings`}>
          Upgrade plan
        </Link>
      </Banner>
    );
  },
);
