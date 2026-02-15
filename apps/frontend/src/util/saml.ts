export function getSAMLLoginUrl(args: {
  teamSlug: string;
  redirect: string | null;
}) {
  const { teamSlug, redirect } = args;
  const url = new URL(
    `/auth/saml/${encodeURIComponent(teamSlug)}/login`,
    window.location.origin,
  );
  if (redirect) {
    url.searchParams.set("r", redirect);
  }
  return url.toString();
}

export function redirectToSAMLLogin(args: {
  teamSlug: string;
  redirect: string | null;
  replace: boolean;
}) {
  const { teamSlug, redirect, replace } = args;
  const url = getSAMLLoginUrl({ teamSlug, redirect });
  if (replace) {
    window.location.replace(url.toString());
  } else {
    window.location.href = url.toString();
  }
}
