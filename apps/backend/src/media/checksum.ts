import { hashMediaObject } from "./object";

/** S3 expects the raw digest, base64 encoded, not the hex form clients declare. */
export function sha256HexToBase64(hash: string): string {
  return Buffer.from(hash, "hex").toString("base64");
}

/**
 * Compare the object's bytes with the hash the key was built from.
 *
 * S3 reports a checksum only on objects uploaded through the signed POST, so
 * older objects are streamed through SHA-256 instead. Nothing is buffered in
 * memory, and an object with a checksum never costs a full read.
 */
export async function mediaObjectMatchesHash(args: {
  key: string;
  hash: string;
  checksumSha256: string | null;
}): Promise<boolean> {
  const expected = sha256HexToBase64(args.hash);
  if (args.checksumSha256) {
    return args.checksumSha256 === expected;
  }
  return (await hashMediaObject(args.key)) === expected;
}
