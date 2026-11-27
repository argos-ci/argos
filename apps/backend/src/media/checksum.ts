/** S3 expects the raw digest, base64 encoded, not the hex form clients declare. */
export function sha256HexToBase64(hash: string): string {
  return Buffer.from(hash, "hex").toString("base64");
}
