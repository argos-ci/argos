import { describe, expect, it } from "vitest";

import { isHttp2GoAwayCode0Error } from "./error";

const GOAWAY_ERROR_MESSAGE = 'HTTP/2: "GOAWAY" frame received with code 0';

describe("isHttp2GoAwayCode0Error", () => {
  it("detects the HTTP/2 GOAWAY code 0 error", () => {
    expect(isHttp2GoAwayCode0Error(new Error(GOAWAY_ERROR_MESSAGE))).toBe(true);
  });

  it("detects the error through aggregate errors and causes", () => {
    const socketError = new Error(GOAWAY_ERROR_MESSAGE);
    const fetchError = new TypeError("fetch failed", { cause: socketError });
    const requestError = new Error(GOAWAY_ERROR_MESSAGE, {
      cause: fetchError,
    });
    const error = new AggregateError([requestError], GOAWAY_ERROR_MESSAGE);

    expect(isHttp2GoAwayCode0Error(error)).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isHttp2GoAwayCode0Error(new Error("fetch failed"))).toBe(false);
  });
});
