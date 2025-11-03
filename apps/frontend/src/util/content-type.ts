/**
 * Check if a content type is an image.
 */
export function checkIsImageContentType(contentType: string): boolean {
  return contentType.startsWith("image/");
}
