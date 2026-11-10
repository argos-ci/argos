import { memo } from "react";
import { PLAN_LIMIT_WARNING_RATIO } from "@argos/schemas/plan-limit";
import { AlertTriangleIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { Banner } from "@/ui/Banner";
import { Link } from "@/ui/Link";

import { getAccountURL } from "../Account/AccountParams";

const _AccountFragment = graphql(`
  fragment OvercapacityBanner_Account on Account {
    permissions
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
    const visible =
      plan && !plan.usageBased && consumptionRatio >= PLAN_LIMIT_WARNING_RATIO;
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
        {account.permissions.includes(AccountPermission.Admin) ? (
          <Link href={`${getAccountURL({ accountSlug })}/settings/billing`}>
            Upgrade plan
          </Link>
        ) : account.__typename === "Team" ? (
          <span>Ask a team owner to upgrade the plan.</span>
        ) : null}
      </Banner>
    );
  },
);
