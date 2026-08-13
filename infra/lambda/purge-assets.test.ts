import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@aws-sdk/client-s3", () => {
  class FakeCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  return {
    S3Client: class {
      send = send;
    },
    ListObjectsV2Command: class extends FakeCommand {
      readonly kind = "list";
    },
    GetObjectCommand: class extends FakeCommand {
      readonly kind = "get";
    },
    DeleteObjectsCommand: class extends FakeCommand {
      readonly kind = "delete";
    },
  };
});

const NOW = new Date("2026-08-12T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

type S3Object = { Key: string; LastModified: Date };

/**
 * Wires `send` to a bucket described as a listing per prefix plus the body of
 * each manifest, and records everything the handler asks to delete.
 */
function givenBucket(options: {
  assets: S3Object[];
  manifests: S3Object[];
  manifestBodies: Record<string, string>;
}) {
  const deleted: string[] = [];
  send.mockImplementation((command: { kind: string; input: any }) => {
    switch (command.kind) {
      case "list": {
        const prefix = command.input.Prefix;
        const contents =
          prefix === "assets/" ? options.assets : options.manifests;
        return Promise.resolve({ Contents: contents });
      }
      case "get": {
        const body = options.manifestBodies[command.input.Key];
        if (body === undefined) {
          return Promise.reject(new Error("NoSuchKey"));
        }
        return Promise.resolve({
          Body: { transformToString: () => Promise.resolve(body) },
        });
      }
      case "delete": {
        for (const { Key } of command.input.Delete.Objects) {
          deleted.push(Key);
        }
        return Promise.resolve({ Errors: [] });
      }
      default:
        throw new Error(`Unexpected command: ${command.kind}`);
    }
  });
  return { deleted };
}

async function runHandler(): Promise<void> {
  const { handler } = await import("./purge-assets.ts");
  await handler();
}

describe("purge-assets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.resetModules();
    vi.stubEnv("BUCKET", "argos-assets-test");
    vi.stubEnv("RETENTION_DAYS", "30");
    send.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("deletes an asset no manifest in the window still references", async () => {
    const { deleted } = givenBucket({
      assets: [
        { Key: "assets/live-aaa.js", LastModified: daysAgo(10) },
        { Key: "assets/orphan-bbb.js", LastModified: daysAgo(10) },
      ],
      manifests: [{ Key: "manifests/sha1.json", LastModified: daysAgo(5) }],
      manifestBodies: {
        "manifests/sha1.json": JSON.stringify({ keys: ["assets/live-aaa.js"] }),
      },
    });

    await runHandler();

    expect(deleted).toEqual(["assets/orphan-bbb.js"]);
  });

  it("keeps an asset that only an older build in the window references", async () => {
    // The whole point of the window: a tab opened days ago still loads lazy
    // chunks from the build it booted on.
    const { deleted } = givenBucket({
      assets: [{ Key: "assets/old-aaa.js", LastModified: daysAgo(25) }],
      manifests: [
        { Key: "manifests/old.json", LastModified: daysAgo(25) },
        { Key: "manifests/new.json", LastModified: daysAgo(1) },
      ],
      manifestBodies: {
        "manifests/old.json": JSON.stringify({ keys: ["assets/old-aaa.js"] }),
        "manifests/new.json": JSON.stringify({ keys: ["assets/new-bbb.js"] }),
      },
    });

    await runHandler();

    expect(deleted).toEqual([]);
  });

  it("never deletes an asset younger than the manifest-write gap", async () => {
    // A deploy uploads assets and *then* writes its manifest. Between the two
    // the new chunks are referenced by nothing, and deleting them would break
    // the release that is about to go live.
    const { deleted } = givenBucket({
      assets: [{ Key: "assets/just-uploaded.js", LastModified: daysAgo(0.02) }],
      manifests: [{ Key: "manifests/sha1.json", LastModified: daysAgo(5) }],
      manifestBodies: {
        "manifests/sha1.json": JSON.stringify({ keys: [] }),
      },
    });

    await runHandler();

    expect(deleted).toEqual([]);
  });

  it("refuses to purge when no manifest falls inside the window", async () => {
    // An empty keep-set means "delete everything". A listing failure or a
    // renamed prefix is far likelier than a genuinely idle month.
    const { deleted } = givenBucket({
      assets: [{ Key: "assets/live-aaa.js", LastModified: daysAgo(10) }],
      manifests: [{ Key: "manifests/ancient.json", LastModified: daysAgo(90) }],
      manifestBodies: {
        "manifests/ancient.json": JSON.stringify({ keys: [] }),
      },
    });

    await runHandler();

    expect(deleted).toEqual([]);
  });

  it("refuses to purge when a manifest in the window cannot be read", async () => {
    // Treating an unreadable manifest as "references nothing" would delete
    // live assets on the strength of a corrupt file.
    const { deleted } = givenBucket({
      assets: [{ Key: "assets/live-aaa.js", LastModified: daysAgo(10) }],
      manifests: [
        { Key: "manifests/good.json", LastModified: daysAgo(2) },
        { Key: "manifests/corrupt.json", LastModified: daysAgo(3) },
      ],
      manifestBodies: {
        "manifests/good.json": JSON.stringify({ keys: [] }),
        "manifests/corrupt.json": "{ this is not json",
      },
    });

    await runHandler();

    expect(deleted).toEqual([]);
  });

  it("drops manifests that have aged out", async () => {
    const { deleted } = givenBucket({
      assets: [],
      manifests: [
        { Key: "manifests/fresh.json", LastModified: daysAgo(2) },
        { Key: "manifests/stale.json", LastModified: daysAgo(40) },
      ],
      manifestBodies: {
        "manifests/fresh.json": JSON.stringify({ keys: [] }),
        "manifests/stale.json": JSON.stringify({ keys: [] }),
      },
    });

    await runHandler();

    expect(deleted).toEqual(["manifests/stale.json"]);
  });
});
