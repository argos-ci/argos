import { useQuery } from "@apollo/client/react";
import { FolderCode } from "lucide-react";
import { useLocation, useMatch } from "react-router";

import { useAuth } from "@/containers/Auth";
import { graphql } from "@/gql";
import { getProjectURL } from "@/pages/Project/ProjectParams";
import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLabel,
  BreadcrumbLink,
  BreadcrumbMenuButton,
  BreadcrumbSplitButton,
} from "@/ui/Breadcrumb";
import { Menu, MenuRoot, MenuTrigger } from "@/ui/menu-kit";

import { getStaffMenuSection } from "./AccountBreadcrumb";
import { getAccountMenuSections } from "./AccountBreadcrumbMenu";
import {
  getProjectMenuSection,
  ProjectBreadcrumbMenu,
} from "./ProjectBreadcrumbMenu";

const AccountQuery = graphql(`
  query ProjectBreadcrumb_account($slug: String!) {
    account(slug: $slug) {
      id
      name
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
  const me = auth.status === "authenticated" ? auth.account : null;
  const { pathname } = useLocation();
  const isCurrent = useMatch("/:accountSlug/:projectName/:any?");
  // Resolved here rather than inside the menu: a menu's rows are read when it
  // opens and filtered as you type, so they have to all be there from the
  // start. The button appears with the answer.
  const { data, error } = useQuery(AccountQuery, {
    variables: { slug: accountSlug },
    skip: !me,
  });
  const projectNames = data?.account?.projects.edges.map(({ name }) => name);

  if (error) {
    throw error;
  }

  const content = (
    <>
      {/* A phone's trail is text: the folder adds nothing there. */}
      <BreadcrumbItemIcon className="max-md:hidden">
        <FolderCode size={18} />
      </BreadcrumbItemIcon>
      {/* On a phone the account crumb goes, and the team names itself here
          instead, on a line above the project's: each name gets the width. */}
      <span className="flex min-w-0 flex-col text-left">
        <BreadcrumbLabel className="text-low text-xs leading-3.5 font-normal md:hidden">
          {data?.account?.name || accountSlug}
        </BreadcrumbLabel>
        <BreadcrumbLabel className="max-md:leading-4.5">
          {projectName}
        </BreadcrumbLabel>
      </span>
    </>
  );

  return (
    <BreadcrumbItem>
      {me && projectNames ? (
        <>
          <BreadcrumbSplitButton
            href={getProjectURL({ accountSlug, projectName })}
            current={Boolean(isCurrent)}
            menuLabel="Switch project"
            menu={
              <ProjectBreadcrumbMenu
                accountSlug={accountSlug}
                projectNames={projectNames}
              />
            }
            className="max-md:hidden"
          >
            {content}
          </BreadcrumbSplitButton>
          {/* On a phone the same button switches the team too, as the
              account crumb is gone. It ends the trail there: the test after
              it is left out. */}
          <div className="contents md:hidden">
            <MenuRoot>
              <MenuTrigger>
                <BreadcrumbMenuButton current className="max-md:h-10">
                  {content}
                </BreadcrumbMenuButton>
              </MenuTrigger>
              <Menu side="bottom" align="start">
                {getProjectMenuSection(accountSlug, projectNames)}
                {getAccountMenuSections(me, pathname)}
                {me.staff
                  ? getStaffMenuSection(
                      data?.account?.__typename === "Team" ? accountSlug : null,
                    )
                  : null}
              </Menu>
            </MenuRoot>
          </div>
        </>
      ) : (
        <BreadcrumbLink
          href={`${accountSlug}/${projectName}/builds`}
          aria-current={isCurrent ? "page" : undefined}
        >
          {content}
        </BreadcrumbLink>
      )}
    </BreadcrumbItem>
  );
}
