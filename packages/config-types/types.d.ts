/**
 * Client config types shared between frontend and backend.
 */
export interface ClientConfig {
  /** Whether this is a self-hosted instance. */
  selfHosted: boolean;
  sentry: {
    environment: string;
    clientDsn: string;
  };
  session: {
    domain: string;
  };
  /** For self-hosted instances: auto-redirect login to this team's SSO. Null on cloud. */
  samlTeamSlug: string | null;
  releaseVersion: string;
  contactEmail: string;
  github: {
    appUrl: string;
    clientId: string;
    loginUrl: string;
    marketplaceUrl: string;
  };
  githubLight: {
    appUrl: string;
  };
  gitlab: {
    loginUrl: string;
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
  };
  bucket: {
    publishableKey: string;
  };
}
