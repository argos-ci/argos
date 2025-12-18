/**
 * Escape text to be displayed safely in a Slack message, including as link title.
 */
export function escapeSlackText(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&pipe;");
}
