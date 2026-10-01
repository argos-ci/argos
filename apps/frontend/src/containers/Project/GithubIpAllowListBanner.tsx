import { memo } from "react";
import { invariant } from "@argos/util/invariant";
import { AlertTriangleIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { Banner } from "@/ui/Banner";
import { Link } from "@/ui/Link";

const _ProjectFragment = graphql(`
  fragment GithubIpAllowListBanner_Project on Project {
    githubIpAllowListBlocked
    repository {
      id
      fullName
    }
  }
`);

export const GithubIpAllowListBanner = memo(
  (props: { project: DocumentType<typeof _ProjectFragment> }) => {
    const { githubIpAllowListBlocked, repository } = props.project;
    if (!githubIpAllowListBlocked) {
      return null;
    }
    invariant(repository, "A blocked project has a GitHub repository");

    return (
      <Banner
        className="flex shrink-0 items-center justify-center gap-2 border-b"
        color="danger"
      >
        <AlertTriangleIcon className="size-4 shrink-0" />
        <span>
          An IP allow list on GitHub blocks Argos from {repository.fullName}:
          builds may fail, and statuses and comments are not posted.
        </span>
        <Link href="https://argos-ci.com/contact" target="_blank">
          Contact us to get the IP address to allow
        </Link>
      </Banner>
    );
  },
);
