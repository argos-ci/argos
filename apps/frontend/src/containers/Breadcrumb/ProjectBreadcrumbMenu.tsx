import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { RepoIcon } from "@primer/octicons-react";
import { PlusCircleIcon } from "lucide-react";
import { Section } from "react-aria-components";
import { useParams } from "react-router-dom";

import { graphql } from "@/gql";
import { BreadcrumbMenuButton } from "@/ui/Breadcrumb";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuLoader,
  MenuText,
  MenuTitle,
  MenuTrigger,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";

const AccountQuery = graphql(`
  query ProjectBreadcrumbMenu_account($slug: String!) {
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

function Projects(props: { accountSlug: string }) {
  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: props.accountSlug },
  });
  const projectNames =
    data.account?.projects.edges
      .map(({ name }) => name)
      .sort((sa, sb) => sa.localeCompare(sb)) ?? [];

  if (projectNames.length === 0) {
    return <MenuText>No active project found</MenuText>;
  }

  return (
    <>
      {projectNames.map((projectName) => {
        return (
          <MenuItem
            key={projectName}
            href={`${props.accountSlug}/${projectName}`}
          >
            <MenuItemIcon>
              <RepoIcon size={18} />
            </MenuItemIcon>
            {projectName}
          </MenuItem>
        );
      })}
    </>
  );
}

export function ProjectBreadcrumbMenu() {
  const { accountSlug } = useParams();

  if (!accountSlug) {
    return null;
  }

  const title = "Switch project";

  return (
    <MenuTrigger>
      <BreadcrumbMenuButton />
      <Popover placement="bottom start">
        <Menu>
          <Section>
            <MenuTitle>{title}</MenuTitle>
            <Suspense fallback={<MenuLoader />}>
              <Projects accountSlug={accountSlug} />
            </Suspense>
          </Section>
          <MenuItem href={`/${accountSlug}/new`}>
            <MenuItemIcon>
              <PlusCircleIcon />
            </MenuItemIcon>
            Create a Project
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
