import { describe, expect, it, vi } from "vitest";

const hashMediaObject = vi.hoisted(() => vi.fn());

vi.mock("./object", () => ({ hashMediaObject }));

const { mediaObjectMatchesHash } = await import("./checksum");

const HASH = "a".repeat(64);
const CHECKSUM = Buffer.from(HASH, "hex").toString("base64");

describe("mediaObjectMatchesHash", () => {
  it("uses the stored checksum without downloading the object", async () => {
    hashMediaObject.mockClear();

    await expect(
      mediaObjectMatchesHash({
        key: "media/1/a.png",
        hash: HASH,
        checksumSha256: CHECKSUM,
      }),
    ).resolves.toBe(true);
    expect(hashMediaObject).not.toHaveBeenCalled();
  });

  it("streams the object when S3 did not return a checksum", async () => {
    hashMediaObject.mockClear().mockResolvedValueOnce(CHECKSUM);

    await expect(
      mediaObjectMatchesHash({
        key: "media/1/a.png",
        hash: HASH,
        checksumSha256: null,
      }),
    ).resolves.toBe(true);
    expect(hashMediaObject).toHaveBeenCalledWith("media/1/a.png");
  });

  it("rejects a checksum that does not match the declared hash", async () => {
    hashMediaObject.mockClear();

    await expect(
      mediaObjectMatchesHash({
        key: "media/1/a.png",
        hash: HASH,
        checksumSha256: Buffer.alloc(32, 1).toString("base64"),
      }),
    ).resolves.toBe(false);
    expect(hashMediaObject).not.toHaveBeenCalled();
  });
});
