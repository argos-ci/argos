/** The add-ons a team can buy on top of its plan, in the order they are listed. */
export const ADD_ON_KEYS = ["github-sso", "saml-sso", "static-ip"] as const;

export type AddOn = (typeof ADD_ON_KEYS)[number];

/** The plan flags that include an add-on, so that it is not billed. */
type PlanInclusions = {
  githubSsoIncluded: boolean;
  samlIncluded: boolean;
  staticIpIncluded: boolean;
};

/**
 * What each add-on is called, costs a month in dollars, and which plan flag
 * includes it.
 *
 * Shared so the dialog that sells an add-on and the staff pages that estimate a
 * team's bill price it alike.
 */
export const ADD_ONS: Record<
  AddOn,
  { label: string; monthlyPrice: number; includedBy: keyof PlanInclusions }
> = {
  "github-sso": {
    label: "GitHub SSO",
    monthlyPrice: 50,
    includedBy: "githubSsoIncluded",
  },
  "saml-sso": {
    label: "SAML SSO",
    monthlyPrice: 200,
    includedBy: "samlIncluded",
  },
  "static-ip": {
    label: "Static IP",
    monthlyPrice: 200,
    includedBy: "staticIpIncluded",
  },
};

/**
 * The add-ons a team pays for: the ones it enabled that its plan does not
 * include.
 */
export function getBilledAddOns(input: {
  enabled: Record<AddOn, boolean>;
  plan: PlanInclusions | null;
}): AddOn[] {
  const { enabled, plan } = input;
  return ADD_ON_KEYS.filter(
    (key) => enabled[key] && !plan?.[ADD_ONS[key].includedBy],
  );
}

/** What a set of add-ons costs a month, in dollars. */
export function getAddOnsMonthlyPrice(addOns: readonly AddOn[]): number {
  return addOns.reduce((total, key) => total + ADD_ONS[key].monthlyPrice, 0);
}
