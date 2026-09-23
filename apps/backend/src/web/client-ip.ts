import { BlockList, isIP } from "node:net";
import { invariant } from "@argos/util/invariant";
import express, { type Express, type Request } from "express";

/**
 * Cloudflare's edge ranges, as published at https://www.cloudflare.com/ips/.
 * A range missing here costs precision, not safety: requests from it keep the
 * edge address, as if `CF-Connecting-IP` were absent.
 */
const CLOUDFLARE_IPV4_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

const CLOUDFLARE_IPV6_RANGES = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

const cloudflareEdges = new BlockList();

function addRanges(family: "ipv4" | "ipv6", ranges: string[]): void {
  for (const range of ranges) {
    const [network, prefix] = range.split("/");
    invariant(network && prefix, `Invalid range: ${range}`);
    cloudflareEdges.addSubnet(network, Number(prefix), family);
  }
}

addRanges("ipv4", CLOUDFLARE_IPV4_RANGES);
addRanges("ipv6", CLOUDFLARE_IPV6_RANGES);

function isCloudflareEdge(address: string): boolean {
  const family = isIP(address);
  return (
    family !== 0 &&
    cloudflareEdges.check(address, family === 4 ? "ipv4" : "ipv6")
  );
}

/**
 * The visitor's address, from `peer` — the address that connected to our
 * proxy — and the request's `CF-Connecting-IP` header.
 *
 * Production runs visitor → Cloudflare → ALB → app. With `trust proxy` at 1,
 * Express reports the peer the ALB appended to `X-Forwarded-For`, which no
 * client can forge, and for a request that came through Cloudflare that peer
 * is an edge. The visitor is then in `CF-Connecting-IP`, which Cloudflare sets
 * itself: a client cannot override it, not even from a Worker on another zone.
 * From any other peer the header is ignored, since a client reaching the ALB
 * directly can send whatever it likes.
 */
export function resolveClientIp(
  peer: string | undefined,
  connectingIp: string | string[] | undefined,
): string | undefined {
  if (
    peer &&
    isCloudflareEdge(peer) &&
    typeof connectingIp === "string" &&
    isIP(connectingIp) !== 0
  ) {
    return connectingIp;
  }
  return peer;
}

/**
 * Make `req.ip` the visitor's address on every request `app` serves, so the
 * rate limiters, the session records and the security emails all see the
 * person rather than the Cloudflare edge in front of them.
 *
 * `trust proxy` alone cannot say "trust this header, from these peers only",
 * so the stock getter is shadowed on this app's request prototype.
 */
export function trustProxyChain(app: Express): void {
  app.set("trust proxy", 1);
  const getPeer = Object.getOwnPropertyDescriptor(express.request, "ip")?.get;
  invariant(getPeer, "Express no longer defines req.ip as a getter");
  Object.defineProperty(app.request, "ip", {
    configurable: true,
    enumerable: true,
    get(this: Request) {
      return resolveClientIp(
        getPeer.call(this),
        this.headers["cf-connecting-ip"],
      );
    },
  });
}
