import {
  BugAntIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/20/solid";
import {
  Outlet,
  Link as RouterLink,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { Main } from "@/containers/Layout";
import { graphql } from "@/gql";
import { Permission } from "@/gql/graphql";
import { IconButton } from "@/ui/IconButton";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItemIcon,
  useMenuState,
} from "@/ui/Menu";
import { PageLoader } from "@/ui/PageLoader";
import {
  TabLink,
  TabLinkList,
  TabLinkPanel,
  useTabLinkState,
} from "@/ui/TabLink";

import { NotFound } from "../NotFound";

const RepositoryQuery = graphql(`
  query Repository_repository($ownerLogin: String!, $repositoryName: String!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      permissions
    }
  }
`);

const testFilterOptions = [
  { label: "Muted tests only", value: "muted", icon: SpeakerXMarkIcon },
  { label: "Flaky tests only", value: "flaky", icon: BugAntIcon },
  {
    label: "Unstable tests only",
    value: "unstable",
    icon: ExclamationTriangleIcon,
  },
];
const TestTabLink = () => {
  const menu = useMenuState({ placement: "bottom-start", gutter: 4 });
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter");

  return (
    <>
      <div className="inline-flex items-center">
        <TabLink to="tests">
          Tests
          {filter && (
            <>
              : <span className="italic">{filter}</span>
            </>
          )}
        </TabLink>
        <div className="-ml-2">
          <MenuButton state={menu} as={IconButton} size="small">
            <ChevronDownIcon className="h-4 w-4 shrink-0" />
          </MenuButton>
          <Menu state={menu} aria-label="Tests sort options">
            {testFilterOptions.map(({ label, icon: Icon, value }) => {
              return (
                <MenuItem key={value} state={menu} pointer>
                  {(menuItemProps) => (
                    <RouterLink
                      {...menuItemProps}
                      to={`tests${value === filter ? "" : `?filter=${value}`}`}
                    >
                      <MenuItemIcon>
                        <Icon />
                      </MenuItemIcon>
                      {label}
                    </RouterLink>
                  )}
                </MenuItem>
              );
            })}
          </Menu>
        </div>
      </div>
    </>
  );
};

const RepositoryTabs = () => {
  const tab = useTabLinkState();
  return (
    <>
      <TabLinkList state={tab} aria-label="Sections">
        <TabLink to="">Builds</TabLink>
        <TestTabLink />
        <TabLink to="settings">Settings</TabLink>
      </TabLinkList>
      <TabLinkPanel state={tab} as={Main} tabId={tab.selectedId || null}>
        <Outlet context={{ hasWritePermission: true } as OutletContext} />
      </TabLinkPanel>
    </>
  );
};

export interface OutletContext {
  hasWritePermission: boolean;
}

export const useRepositoryContext = () => {
  return useOutletContext<OutletContext>();
};

export const Repository = () => {
  const { ownerLogin, repositoryName } = useParams();
  if (!ownerLogin || !repositoryName) {
    return <NotFound />;
  }
  return (
    <Query
      fallback={<PageLoader />}
      query={RepositoryQuery}
      variables={{ ownerLogin, repositoryName }}
    >
      {({ repository }) => {
        if (!repository) return <NotFound />;
        if (!repository.permissions.includes("read" as Permission)) {
          return <NotFound />;
        }
        if (!repository.permissions.includes("write" as Permission)) {
          return (
            <Outlet context={{ hasWritePermission: false } as OutletContext} />
          );
        }
        return <RepositoryTabs />;
      }}
    </Query>
  );
};
