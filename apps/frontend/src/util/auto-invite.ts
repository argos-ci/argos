export function getAutoInviteTeamsURL(
  redirect: string | null | undefined,
): string {
  if (!redirect || redirect === "/teams") {
    return "/teams";
  }
  const searchParams = new URLSearchParams({ r: redirect });
  return `/teams?${searchParams}`;
}
