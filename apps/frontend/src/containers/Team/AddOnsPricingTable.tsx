import {
  ADD_ON_KEYS,
  ADD_ONS,
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
      githubSso: Boolean(team.ssoGithubAccount),
      samlSso: team.samlPurchased,
      staticIp: team.staticIpEnabled,
    },
    plan: team.plan ?? null,
  });
  const rows = ADD_ON_KEYS.filter(
    (key) => key === enabling || billed.includes(key),
  ).map((key) => ({
    key,
    label: ADD_ONS[key].label,
    price: ADD_ONS[key].monthlyPrice,
  }));
  const total = rows.reduce((sum, row) => sum + row.price, 0);
  return (
    <div>
      {rows.map((row) => (
        <div
          key={row.key}
          className={clsx(
            "text-low my-2 flex justify-between",
            enabling === row.key && "font-bold",
          )}
        >
          <div>{row.label}</div>
          <div>${row.price} / month</div>
        </div>
      ))}
      <hr className="my-2 border-0 border-t" />
      <div className="my-2 flex justify-between font-bold">
        <div>Total</div>
        <div>${total} / month</div>
      </div>
      <p className="text-low mt-2 text-right text-sm">
        * Plus applicable tax and fees
      </p>
    </div>
  );
}
