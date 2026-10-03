import config from "@/config";
import {
  Account,
  GithubRepositoryInstallation,
  Project,
  type GithubInstallation,
} from "@/database/models";

/**
 * The addresses GitHub sees on requests sent through the proxy, for teams to
 * add to their organization's IP allow list.
 */
export function getStaticIpAddresses(): string[] {
  // The format coerces an empty variable to `null` rather than to `[]`.
  return config.get("github.proxyIpAddresses") ?? [];
}

/**
 * Whether calls for an installation must leave through the proxy, from Argos's
 * static IP addresses. Either it was set on the installation by hand, or a team
 * whose projects use the installation enabled Static IP.
 *
 * Derived on every call rather than copied onto installations: a reinstalled
 * app or a newly linked repository would otherwise slip back to dynamic
 * addresses, and an organization's IP allow list then refuses every call.
 */
export async function checkInstallationUsesProxy(
  installation: GithubInstallation,
): Promise<boolean> {
  if (installation.proxy) {
    return true;
  }
  const [project, account] = await Promise.all([
    Project.queryNotDeleted()
      .select("projects.id")
      .join("accounts", "accounts.id", "projects.accountId")
      .join("teams", "teams.id", "accounts.teamId")
      .whereIn(
        "projects.githubRepositoryId",
        GithubRepositoryInstallation.query()
          .select("githubRepositoryId")
          .where("githubInstallationId", installation.id),
      )
      .where("teams.staticIpEnabled", true)
      .first(),
    Account.query()
      .select("accounts.id")
      .join("teams", "teams.id", "accounts.teamId")
      .where("accounts.githubLightInstallationId", installation.id)
      .where("teams.staticIpEnabled", true)
      .first(),
  ]);
  return Boolean(project || account);
}
