/**
 * Get auth URL for Slack authentificaton.
 */
export function getSlackAuthURL(args: { accountId: string }): string {
  return `/auth/slack/login?accountId=${args.accountId}`;
}
