import { Account, TeamUser } from "@/database/models";
import { getEligibleAutoJoinDomain } from "@/database/services/team-domain";
import { createJob } from "@/job-core";

import { setDefaultAccountAvatar } from "./custom-avatar";

/**
 * The icon of a domain, from icon.horse, or null when it has none.
 */
async function fetchDomainIcon(domain: string): Promise<Buffer | null> {
  const url = new URL(`https://icon.horse/icon/${encodeURIComponent(domain)}`);
  // Otherwise a domain without an icon gets a generated letter tile, which is
  // no better than the initial Argos draws itself.
  url.searchParams.set("fallback", "404");
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`icon.horse responded ${response.status} for ${domain}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Give a new team the icon of its organization's domain: the verified company
 * email domain of the member who created it, the one they were offered to let
 * colleagues join with.
 */
async function setTeamAvatarFromDomain(accountId: string) {
  const account = await Account.query().findById(accountId);
  if (!account?.teamId || account.avatarKey || account.githubAccountId) {
    return;
  }
  const creator = await TeamUser.query()
    .select("userId")
    .where({ teamId: account.teamId, userLevel: "owner" })
    .orderBy("id", "asc")
    .first();
  if (!creator) {
    return;
  }
  const domain = await getEligibleAutoJoinDomain({ userId: creator.userId });
  if (!domain) {
    return;
  }
  const icon = await fetchDomainIcon(domain);
  if (!icon) {
    return;
  }
  await setDefaultAccountAvatar({ accountId, image: icon });
}

export const teamAvatarJob = createJob<string>("teamAvatar", {
  perform: setTeamAvatarFromDomain,
});
