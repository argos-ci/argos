import { invariant } from "@argos/util/invariant";
import { groupBy } from "lodash-es";

import config from "@/config";
import {
  GithubInstallation,
  GithubRepository,
  GithubRepositoryInstallation,
  Project,
} from "@/database/models";
import { sendNotification } from "@/notification";
import { boom } from "@/util/error";

import { getStaticIpAddresses } from "./static-ip";

/**
 * The GitHub owner whose IP allow list refuses Argos.
 */
export type IpAllowListOwner = {
  /** Login of the owner, e.g. `acme`. */
  name: string;
  /** Kind of owner as GitHub words it, e.g. `organization`. */
  kind: string;
};

const IP_ALLOW_LIST_MESSAGE_REGEX =
  /the `([^`]+)` (\w+) has an IP allow list enabled/;

/**
 * Read the owner out of the message GitHub answers a token request with when
 * the owner's IP allow list does not include the address Argos calls from.
 */
export function parseIpAllowListOwner(
  message: string,
): IpAllowListOwner | null {
  const match = IP_ALLOW_LIST_MESSAGE_REGEX.exec(message);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return { name: match[1], kind: match[2] };
}

/**
 * The error surfaced to whoever triggered the call: the CLI prints it, and the
 * GraphQL forms show it.
 */
export function createIpAllowListError(input: {
  owner: IpAllowListOwner;
  /** Whether the refused call already left from Argos's static IP addresses. */
  proxied: boolean;
  cause: unknown;
}) {
  const { owner, proxied, cause } = input;
  const addresses = getStaticIpAddresses();
  const fix = !proxied
    ? "Enable Static IP in your Argos team settings, then add its IP addresses to the allow list."
    : addresses.length > 0
      ? `Add Argos's static IP addresses to the allow list: ${addresses.join(", ")}.`
      : "Add Argos's static IP addresses, listed in your Argos team settings, to the allow list.";
  return boom(
    403,
    `The "${owner.name}" GitHub ${owner.kind} has an IP allow list enabled that blocks Argos. ${fix}`,
    { cause, code: "GITHUB_IP_ALLOW_LIST", retryable: false },
  );
}

/**
 * Flag the installation as blocked and email the owners of the projects it
 * serves. Most calls come from background jobs, so without the email nobody
 * would learn why builds stopped reaching GitHub.
 */
export async function markInstallationIpAllowListBlocked(input: {
  installation: GithubInstallation;
  owner: IpAllowListOwner;
  /** Whether the refused call already left from Argos's static IP addresses. */
  proxied: boolean;
}) {
  const { installation, owner, proxied } = input;
  // Only the call that sets the flag notifies: owners get one email per
  // incident, not one per job.
  const flagged = await GithubInstallation.query()
    .patch({ ipAllowListBlockedAt: new Date().toISOString() })
    .where("id", installation.id)
    .whereNull("ipAllowListBlockedAt")
    .returning("id");

  if (flagged.length === 0) {
    return;
  }

  const projects = await Project.queryNotDeleted()
    .whereIn(
      "githubRepositoryId",
      GithubRepositoryInstallation.query()
        .select("githubRepositoryId")
        .where("githubInstallationId", installation.id),
    )
    .withGraphFetched(
      "[account, githubRepository.repoInstallations.installation]",
    );

  // A repository reached by another, unblocked installation keeps working.
  const blockedProjects = projects.filter((project) => {
    invariant(project.githubRepository, "githubRepository relation not loaded");
    return (
      GithubRepository.pickBestInstallation(project.githubRepository)?.id ===
      installation.id
    );
  });

  const projectsByAccount = groupBy(blockedProjects, (project) => {
    invariant(project.account, "account relation not loaded");
    return project.account.id;
  });

  for (const accountProjects of Object.values(projectsByAccount)) {
    const account = accountProjects[0]?.account;
    invariant(account, "Expected account to be defined");
    const ownerIds = await account.$getOwnerIds();
    await sendNotification({
      type: "github_ip_allow_list",
      data: {
        githubOwner: owner,
        staticIp: proxied
          ? { status: "proxied", addresses: getStaticIpAddresses() }
          : account.teamId
            ? {
                status: "available",
                settingsURL: new URL(
                  `/${account.slug}/settings/integrations#static-ip`,
                  config.get("server.url"),
                ).href,
              }
            : { status: "unavailable" },
        projects: accountProjects.map((project) => ({
          name: project.name,
          url: new URL(
            `/${account.slug}/${project.name}`,
            config.get("server.url"),
          ).href,
        })),
      },
      recipients: ownerIds,
    });
  }
}
