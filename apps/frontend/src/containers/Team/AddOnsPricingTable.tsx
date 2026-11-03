import {
  ADD_ON_KEYS,
  ADD_ONS,
  getAddOnsMonthlyPrice,
  getBilledAddOns,
  type AddOn,
} from "@argos/util/add-ons";
import clsx from "clsx";

import { DocumentType, graphql } from "@/gql";

const _TeamFragment = graphql(`
  fragment AddOnsPricingTable_Team on Team {
    id
    samlPurchased
    staticIpEnabled
    plan {
      id
      githubSsoIncluded
      samlIncluded
      staticIpIncluded
    }
    ssoGithubAccount {
      id
    }
  }
`);

export type AddOnsPricingTableTeam = DocumentType<typeof _TeamFragment>;

/**
 * Pricing recap displayed in add-on purchase dialogs. Lists the add-on being
 * enabled along with the already activated ones, and the resulting total.
 */
export function AddOnsPricingTable(props: {
  team: AddOnsPricingTableTeam;
  enabling: AddOn;
}) {
  const { team, enabling } = props;
  const billed = getBilledAddOns({
    enabled: {
      "github-sso": Boolean(team.ssoGithubAccount),
      "saml-sso": team.samlPurchased,
      "static-ip": team.staticIpEnabled,
    },
    plan: team.plan ?? null,
  });
  const keys = ADD_ON_KEYS.filter(
    (key) => key === enabling || billed.includes(key),
  );
  return (
    <div>
      {keys.map((key) => (
        <div
          key={key}
          className={clsx(
            "text-low my-2 flex justify-between",
            enabling === key && "font-bold",
          )}
        >
          <div>{ADD_ONS[key].label}</div>
          <div>${ADD_ONS[key].monthlyPrice} / month</div>
        </div>
      ))}
      <hr className="my-2 border-0 border-t" />
      <div className="my-2 flex justify-between font-bold">
        <div>Total</div>
        <div>${getAddOnsMonthlyPrice(keys)} / month</div>
      </div>
      <p className="text-low mt-2 text-right text-sm">
        * Plus applicable tax and fees
      </p>
    </div>
  );
}
