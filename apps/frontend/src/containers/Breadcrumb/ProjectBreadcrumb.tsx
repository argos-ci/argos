import { useState, type ReactNode } from "react";
import { useQuery } from "@apollo/client/react";
import { FolderCode } from "lucide-react";
import { useMatch } from "react-router";

import { useAuth, type AuthAccount } from "@/containers/Auth";
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
import {
  Menu,
  MenuAutoComplete,
  MenuRoot,
  MenuTrigger,
  useMenuQuery,
} from "@/ui/menu-kit";

import { useAccountMenu } from "./AccountBreadcrumbMenu";
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
            renderMenu={(anchor) => (
              <ProjectBreadcrumbMenu
                accountSlug={accountSlug}
                projectNames={projectNames}
                anchor={anchor}
              />
            )}
            className="max-md:hidden"
          >
            {content}
          </BreadcrumbSplitButton>
          <div className="contents md:hidden">
            <PhoneProjectSwitcher
              me={me}
              accountSlug={accountSlug}
              accountName={data?.account?.name || accountSlug}
              projectNames={projectNames}
            >
              {content}
            </PhoneProjectSwitcher>
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

/**
 * On a phone the project's button switches the team too, as the account crumb
 * is gone. It lists the team's projects under the team's name, which leads to
 * the viewer's accounts, rather than both lists at once: together they ran past
 * the screen.
 */
function PhoneProjectSwitcher(props: {
  me: AuthAccount;
  accountSlug: string;
  accountName: string;
  projectNames: string[];
  children: ReactNode;
}) {
  const { children, ...menuProps } = props;
  const [view, setView] = useState<"projects" | "teams">("projects");
  return (
    <MenuRoot
      // Reset as it opens: on the way out, the closing popup would flash the
      // projects again.
      onOpenChange={(open) => {
        if (open) {
          setView("projects");
        }
      }}
    >
      <MenuTrigger>
        <BreadcrumbMenuButton current className="max-md:h-10">
          {children}
        </BreadcrumbMenuButton>
      </MenuTrigger>
      <MenuAutoComplete>
        <PhoneProjectSwitcherMenu
          {...menuProps}
          view={view}
          onBack={() => setView("teams")}
        />
      </MenuAutoComplete>
    </MenuRoot>
  );
}

function PhoneProjectSwitcherMenu(props: {
  me: AuthAccount;
  accountSlug: string;
  accountName: string;
  projectNames: string[];
  view: "projects" | "teams";
  onBack: () => void;
}) {
  const { me, accountSlug, accountName, projectNames, view, onBack } = props;
  const query = useMenuQuery();
  // A query in the projects view is looking for a project, not a team.
  const accountMenu = useAccountMenu(me, view === "teams" ? query : "");
  return (
    <Menu
      side="bottom"
      align="start"
      search={view === "teams" ? accountMenu.search : false}
      noResultsPlaceholder={accountMenu.noResultsPlaceholder}
    >
      {view === "projects"
        ? getProjectMenuSection(accountSlug, projectNames, {
            title: accountName,
            onBack,
          })
        : accountMenu.rows}
    </Menu>
  );
}
