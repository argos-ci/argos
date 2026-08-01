/**
 * Longest passkey name the API accepts, mirroring the `varchar(255)` column.
 * Enforced on both sides so an over-long name is a field error under the input
 * rather than a rejected mutation.
 */
export const PASSKEY_NAME_MAX_LENGTH = 255;
