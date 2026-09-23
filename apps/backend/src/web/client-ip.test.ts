import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { resolveClientIp, trustProxyChain } from "./client-ip";

const VISITOR = "203.0.113.7";

describe("resolveClientIp", () => {
  it.each([
    ["an IPv4 edge", "172.71.131.124"],
    ["an IPv6 edge", "2606:4700:10::6816:1"],
    ["an IPv4-mapped edge", "::ffff:104.23.229.22"],
  ])("reads the visitor behind %s", (_, edge) => {
    expect(resolveClientIp(edge, VISITOR)).toBe(VISITOR);
    expect(resolveClientIp(edge, "2001:db8::1")).toBe("2001:db8::1");
  });

  // Anyone who reaches the ALB without going through Cloudflare can send the
  // header, so trusting it from them would let one client be anyone.
  it.each(["198.51.100.9", "2001:db8::9", "::ffff:127.0.0.1"])(
    "ignores the header from %s, which is not an edge",
    (peer) => {
      expect(resolveClientIp(peer, VISITOR)).toBe(peer);
    },
  );

  it.each([
    ["missing", undefined],
    ["not an address", "unknown"],
    ["repeated", [VISITOR, "198.51.100.1"]],
  ])("keeps the edge when the header is %s", (_, header) => {
    expect(resolveClientIp("172.71.131.124", header)).toBe("172.71.131.124");
  });
});

describe("trustProxyChain", () => {
  // Supertest connects over loopback, in the ALB's seat: the last
  // `X-Forwarded-For` entry is the peer it appended.
  const app = express();
  trustProxyChain(app);
  app.get("/", (req, res) => {
    res.send(req.ip);
  });

  it("makes req.ip the visitor behind Cloudflare", async () => {
    const res = await request(app)
      .get("/")
      .set("X-Forwarded-For", `${VISITOR}, 172.71.131.124`)
      .set("CF-Connecting-IP", VISITOR);
    expect(res.text).toBe(VISITOR);
  });

  it("leaves req.ip on the peer when Cloudflare was bypassed", async () => {
    const res = await request(app)
      .get("/")
      .set("X-Forwarded-For", "198.51.100.9")
      .set("CF-Connecting-IP", VISITOR);
    expect(res.text).toBe("198.51.100.9");
  });
});
