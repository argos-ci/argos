import type { LookupAddress } from "node:dns";
import { describe, expect, it } from "vitest";

import { lookupPublicAddress, NonPublicAddressError } from "./request";

function lookup(hostname: string, all: boolean) {
  return new Promise<string | LookupAddress[]>((resolve, reject) => {
    lookupPublicAddress(hostname, { all }, (error, address) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(address);
    });
  });
}

describe("lookupPublicAddress", () => {
  it.each([true, false])(
    "refuses a name resolving to a loopback address (all: %s)",
    async (all) => {
      await expect(lookup("localhost", all)).rejects.toBeInstanceOf(
        NonPublicAddressError,
      );
    },
  );
});
