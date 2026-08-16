import { useQuery } from "@apollo/client/react";
import { FolderCode } from "lucide-react";
import { useMatch } from "react-router";

import { useAuth } from "@/containers/Auth";
import { graphql } from "@/gql";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
  BreadcrumbMenuButton,
} from "@/ui/Breadcrumb";
import { MenuRoot, MenuTrigger } from "@/ui/menu-kit";

import { ProjectBreadcrumbMenu } from "./ProjectBreadcrumbMenu";

const AccountQuery = graphql(`
  query ProjectBreadcrumb_account($slug: String!) {
    account(slug: $slug) {
      id
      projects(first: 100, after: 0) {
        edges {
          id
          name
        }
      }
    }
  }
`);

export function ProjectBreadcrumbItem(props: {
  accountSlug: string;
  projectName: string;
}) {
  const { accountSlug, projectName } = props;

  const auth = useAuth();
  const isCurrent = useMatch("/:accountSlug/:projectName/:any?");
  // Resolved here rather than inside the menu: a menu's rows are read when it
  // opens and filtered as you type, so they have to all be there from the
  // start. The button appears with the answer.
  const { data, error } = useQuery(AccountQuery, {
    variables: { slug: accountSlug },
    skip: auth.status !== "authenticated",
  });

  if (error) {
    throw error;
  }

  return (
    <BreadcrumbItem>
      <BreadcrumbLink
        href={`${accountSlug}/${projectName}/builds`}
        aria-current={isCurrent ? "page" : undefined}
      >
        <BreadcrumbItemIcon>
          <FolderCode size={18} />
        </BreadcrumbItemIcon>
        {projectName}
      </BreadcrumbLink>
      {auth.status === "authenticated" && data?.account ? (
        <MenuRoot>
          <MenuTrigger>
            <BreadcrumbMenuButton />
          </MenuTrigger>
          <ProjectBreadcrumbMenu
            accountSlug={accountSlug}
            projectNames={data.account.projects.edges.map(({ name }) => name)}
          />
        </MenuRoot>
      ) : null}
    </BreadcrumbItem>
  );
}
