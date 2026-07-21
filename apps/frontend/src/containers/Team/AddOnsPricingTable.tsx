import clsx from "clsx";

import { GITHUB_SSO_PRICING, SAML_SSO_PRICING } from "@/constants";
import { DocumentType, graphql } from "@/gql";

const _TeamFragment = graphql(`
  fragment AddOnsPricingTable_Team on Team {
    id
    samlPurchased
    plan {
      id
      githubSsoIncluded
      samlIncluded
    }
    ssoGithubAccount {
      id
    }
  }
`);

export type AddOn = "github-sso" | "saml-sso";

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
  const rows: { key: AddOn; label: string; price: number }[] = [];
  if (
    enabling === "github-sso" ||
    (team.ssoGithubAccount && !team.plan?.githubSsoIncluded)
  ) {
    rows.push({
      key: "github-sso",
      label: "GitHub SSO",
      price: GITHUB_SSO_PRICING,
    });
  }
  if (
    enabling === "saml-sso" ||
    (team.samlPurchased && !team.plan?.samlIncluded)
  ) {
    rows.push({ key: "saml-sso", label: "SAML SSO", price: SAML_SSO_PRICING });
  }
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
