import { describe, expect, it } from "vitest";

import {
  isAllowedRedirectUri,
  isHttpUri,
  isSafeUri,
  trimTrailingSlash,
} from "./url";

describe("#trimTrailingSlash", () => {
  it("removes a single trailing slash", () => {
    expect(trimTrailingSlash("https://x.com/")).toBe("https://x.com");
  });

  it("removes multiple trailing slashes", () => {
    expect(trimTrailingSlash("https://x.com///")).toBe("https://x.com");
  });

  it("leaves URLs without trailing slashes untouched", () => {
    expect(trimTrailingSlash("https://x.com/v2")).toBe("https://x.com/v2");
    expect(trimTrailingSlash("")).toBe("");
  });

  it("handles slash-only strings", () => {
    expect(trimTrailingSlash("///")).toBe("");
  });
});

describe("#isSafeUri", () => {
  it("accepts http(s) and custom app schemes", () => {
    expect(isSafeUri("https://app.example/cb")).toBe(true);
    expect(isSafeUri("http://localhost:1234/cb")).toBe(true);
    expect(isSafeUri("vscode://callback")).toBe(true);
  });

  it("rejects script-executing schemes", () => {
    expect(isSafeUri("javascript:alert(1)")).toBe(false);
    expect(isSafeUri("JavaScript:alert(1)")).toBe(false);
    expect(isSafeUri("data:text/html,<script>1</script>")).toBe(false);
    expect(isSafeUri("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeUri("blob:https://x/y")).toBe(false);
    expect(isSafeUri("file:///etc/passwd")).toBe(false);
  });

  it("rejects non-URLs", () => {
    expect(isSafeUri("not a url")).toBe(false);
  });
});

describe("#isHttpUri", () => {
  it("accepts only http(s)", () => {
    expect(isHttpUri("https://x.com")).toBe(true);
    expect(isHttpUri("http://x.com")).toBe(true);
    expect(isHttpUri("vscode://cb")).toBe(false);
    expect(isHttpUri("javascript:alert(1)")).toBe(false);
    expect(isHttpUri("nope")).toBe(false);
  });
});

describe("#isAllowedRedirectUri", () => {
  it("allows https anywhere", () => {
    expect(isAllowedRedirectUri("https://app.example/cb")).toBe(true);
  });

  it("allows http only for loopback", () => {
    expect(isAllowedRedirectUri("http://localhost/cb")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:5000/cb")).toBe(true);
    expect(isAllowedRedirectUri("http://example.com/cb")).toBe(false);
  });

  it("allows private-use schemes for native apps", () => {
    expect(isAllowedRedirectUri("vscode://cb")).toBe(true);
    expect(isAllowedRedirectUri("com.example.app://cb")).toBe(true);
  });

  it("rejects script-executing schemes", () => {
    expect(isAllowedRedirectUri("javascript:alert(1)")).toBe(false);
    expect(isAllowedRedirectUri("data:text/html,x")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isAllowedRedirectUri("::::")).toBe(false);
  });
});
