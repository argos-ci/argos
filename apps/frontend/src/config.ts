import type { ClientConfig } from "@argos/config-types";

declare global {
  interface Window {
    /** Inlined by the backend, see `apps/backend/src/web/app-router.ts`. */
    clientData?: { config: ClientConfig };
  }
}

const clientData = window.clientData;
if (!clientData) {
  throw new Error("Configuration is not available, please reload the page");
}
export const config: ClientConfig = clientData.config;
