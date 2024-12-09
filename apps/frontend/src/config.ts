import type { ClientConfig } from "@argos/config-types";

const clientData = (window as any).clientData;
if (!clientData) {
  throw new Error("Configuration is not available, please reload the page");
}
export const config: ClientConfig = clientData.config;
