import { BlockList, isIP } from "node:net";

import { boom } from "@/util/error";

/**
 * Addresses a webhook must never reach: loopback, private networks, link-local
 * (where cloud metadata services live), and the reserved and translation
 * ranges that can lead back to them.
 *
 * `::ffff:0:0/96` (IPv4-mapped) is left out on purpose: `BlockList` checks a
 * mapped address against the IPv4 rules already, and blocking that range
 * would also block every IPv4 address.
 */
const NON_PUBLIC_ADDRESSES = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  NON_PUBLIC_ADDRESSES.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  NON_PUBLIC_ADDRESSES.addSubnet(network, prefix, "ipv6");
}

/**
 * Whether an IP address is reachable on the public internet.
 */
export function checkIsPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) {
    return false;
  }
  return !NON_PUBLIC_ADDRESSES.check(address, family === 4 ? "ipv4" : "ipv6");
}

/**
 * The IP address a URL hostname is written as, or `null` for a domain name.
 */
function getLiteralAddress(hostname: string): string | null {
  const unbracketed = hostname.replace(/^\[(.*)\]$/, "$1");
  return isIP(unbracketed) ? unbracketed : null;
}

/**
 * Validate and normalize a webhook URL. Throws a user-facing error when Argos
 * cannot post to it.
 *
 * Only the hostname as written is checked here. A domain name can resolve to
 * a private address, which the request itself refuses (see `./request.ts`).
 */
export function parseWebhookUrl(
  input: string,
  options: { allowPrivateNetwork: boolean },
): string {
  const trimmed = input.trim();

  if (trimmed.length > 2048) {
    throw boom(400, "The URL is too long. Use one under 2048 characters.", {
      field: "url",
    });
  }

  const url = (() => {
    try {
      return new URL(trimmed);
    } catch {
      throw boom(400, "This is not a valid URL.", { field: "url" });
    }
  })();

  const allowedProtocols = options.allowPrivateNetwork
    ? ["https:", "http:"]
    : ["https:"];
  if (!allowedProtocols.includes(url.protocol)) {
    throw boom(400, "The URL must start with https://.", { field: "url" });
  }

  if (url.username || url.password) {
    throw boom(
      400,
      "The URL cannot include a username or password. Pass credentials in the path or the query string instead.",
      { field: "url" },
    );
  }

  if (!options.allowPrivateNetwork) {
    const hostname = url.hostname.replace(/\.$/, "");
    const address = getLiteralAddress(hostname);
    const isPrivate = address
      ? !checkIsPublicAddress(address)
      : !hostname.includes(".") || hostname.endsWith(".localhost");
    if (isPrivate) {
      throw boom(400, "The URL must point to a public address.", {
        field: "url",
      });
    }
  }

  // Fragments are never sent to the server.
  url.hash = "";

  return url.toString();
}
