/**
 * Format a byte count the way a file listing does: whole numbers for anything
 * over a megabyte, one decimal below, because "1.4 MB" is useful and "1.437 MB"
 * is noise.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

/**
 * How long a media has left, as a coarse countdown.
 *
 * Coarse on purpose: what a reader needs to know is whether the link they are
 * about to paste somewhere will outlive the review, and "29 days left" answers
 * that where a timestamp makes them do arithmetic.
 */
export function formatExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) {
    return null;
  }
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) {
    return "expired";
  }
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  if (days >= 1) {
    return `${days}d left`;
  }
  const hours = Math.max(1, Math.floor(remainingMs / (60 * 60 * 1000)));
  return `${hours}h left`;
}

/** Compact dimensions, e.g. `1440×900`. Null when they aren't known yet. */
export function formatDimensions(
  width: number | null,
  height: number | null,
): string | null {
  if (width === null || height === null) {
    return null;
  }
  return `${width}×${height}`;
}
