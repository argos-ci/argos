/** The add-ons a team can buy on top of its plan, in the order they are listed. */
export const ADD_ON_KEYS = ["github-sso", "saml-sso", "static-ip"] as const;

export type AddOn = (typeof ADD_ON_KEYS)[number];

/**
 * What each add-on is called and costs a month, in dollars.
 *
 * Shared so the dialog that sells an add-on and the staff pages that estimate a
 * team's bill price it alike.
 */
export const ADD_ONS: Record<AddOn, { label: string; monthlyPrice: number }> = {
  "github-sso": { label: "GitHub SSO", monthlyPrice: 50 },
  "saml-sso": { label: "SAML SSO", monthlyPrice: 200 },
  "static-ip": { label: "Static IP", monthlyPrice: 200 },
};

/**
 * The add-ons a team pays for: the ones it enabled that its plan does not
 * include. In the order `ADD_ON_KEYS` lists them.
 */
export function getBilledAddOns(input: {
  enabled: { githubSso: boolean; samlSso: boolean; staticIp: boolean };
  plan: {
    githubSsoIncluded: boolean;
    samlIncluded: boolean;
    staticIpIncluded: boolean;
  } | null;
}): AddOn[] {
  const { enabled, plan } = input;
  const billed: AddOn[] = [];
  if (enabled.githubSso && !plan?.githubSsoIncluded) {
    billed.push("github-sso");
  }
  if (enabled.samlSso && !plan?.samlIncluded) {
    billed.push("saml-sso");
  }
  if (enabled.staticIp && !plan?.staticIpIncluded) {
    billed.push("static-ip");
  }
  return billed;
}

/** What a set of add-ons costs a month, in dollars. */
export function getAddOnsMonthlyPrice(addOns: readonly AddOn[]): number {
  return addOns.reduce((total, key) => total + ADD_ONS[key].monthlyPrice, 0);
}
