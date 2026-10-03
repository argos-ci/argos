import { memo } from "react";
import { invariant } from "@argos/util/invariant";
import { AlertTriangleIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { Banner } from "@/ui/Banner";
import { Link } from "@/ui/Link";

const _ProjectFragment = graphql(`
  fragment GithubIpAllowListBanner_Project on Project {
    githubIpAllowListBlock {
      staticIp
      staticIpAddresses
    }
    repository {
      id
      fullName
    }
    account {
      id
      slug
      permissions
    }
  }
`);

export const GithubIpAllowListBanner = memo(
  (props: { project: DocumentType<typeof _ProjectFragment> }) => {
    const { githubIpAllowListBlock, repository, account } = props.project;
    if (!githubIpAllowListBlock) {
      return null;
    }
    invariant(repository, "A blocked project has a GitHub repository");

    const staticIpURL = `/${account.slug}/settings/integrations#static-ip`;
    const isAdmin = account.permissions.includes(AccountPermission.Admin);
    const fix = (() => {
      if (githubIpAllowListBlock.staticIp) {
        return githubIpAllowListBlock.staticIpAddresses.length > 0 ? (
          <span>
            Add Argos’s static IP addresses to the allow list:{" "}
            <strong>
              {githubIpAllowListBlock.staticIpAddresses.join(", ")}
            </strong>
            .
          </span>
        ) : (
          <Link href={staticIpURL}>See the static IP addresses to allow</Link>
        );
      }
      if (account.__typename !== "Team") {
        return <span>Static IP, which lets Argos through, needs a team.</span>;
      }
      if (!isAdmin) {
        return <span>Ask a team owner to enable Static IP.</span>;
      }
      return <Link href={staticIpURL}>Enable Static IP</Link>;
    })();

    return (
      <Banner
        className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b"
        color="danger"
      >
        <AlertTriangleIcon className="size-4 shrink-0" />
        <span>
          An IP allow list on GitHub blocks Argos from {repository.fullName}:
          builds may fail, and statuses and comments are not posted.
        </span>
        {fix}
      </Banner>
    );
  },
);
