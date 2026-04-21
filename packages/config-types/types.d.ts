/**
 * Client config types shared between frontend and backend.
 */
export interface ClientConfig {
  selfHosted: boolean;
  sentry: {
    environment: string;
    clientDsn: string;
  };
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
