/**
 * Client config types shared between frontend and backend.
 */
export interface ClientConfig {
  sentry: {
    environment: string;
    clientDsn: string;
  };
  session: {
    domain: string;
  };
  samlTeamSlug: string;
  releaseVersion: string;
  contactEmail: string;
  github: {
    clientId: string;
    marketplaceUrl: string;
  };
  stripe: {
    pricingTableId: string;
    publishableKey: string;
  };
  server: {
    url: string;
  };
  api: {
    baseUrl: string;
  };
  deployments: {
    baseDomain: string;
    /** Whether this install can provision custom domains at all. */
    customDomains: boolean;
  };
}
