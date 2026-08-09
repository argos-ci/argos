/**
 * The Network Information API, which TypeScript's DOM lib doesn't declare
 * because it isn't on a standards track. Only the members the app reads are
 * declared, and `connection` is optional: Safari and Firefox don't ship it.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
interface NetworkInformation {
  /** User has asked for reduced data usage. */
  readonly saveData?: boolean;
  readonly effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
}

interface Navigator {
  readonly connection?: NetworkInformation;
}
