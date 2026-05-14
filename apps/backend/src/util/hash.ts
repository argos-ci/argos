import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import * as Sentry from "@sentry/node";

/**
 * Generates a SHA-256 hash of a file's contents.
 */
export function hashFileSha256(filePath: string): Promise<string> {
  return Sentry.startSpan(
    {
      name: "hashFileSha256",
      attributes: {
        "argos.hash.path": filePath,
      },
    },
    () =>
      new Promise<string>((resolve, reject) => {
        const hash = createHash("sha256");
        const stream = createReadStream(filePath);

        stream.on("error", reject);

        stream.on("data", (chunk) => {
          hash.update(chunk);
        });

        stream.on("end", () => {
          resolve(hash.digest("hex"));
        });
      }),
  );
}
