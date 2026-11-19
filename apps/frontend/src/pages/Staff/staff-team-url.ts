export function getStaffTeamURL(teamSlug: string): string {
  return `/staff/teams/${encodeURIComponent(teamSlug)}`;
}
