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
