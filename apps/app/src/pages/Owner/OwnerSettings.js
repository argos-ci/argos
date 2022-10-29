import { gql } from "graphql-tag";
import { Helmet } from "react-helmet";
import { Route, Routes, useParams } from "react-router-dom";

import {
  Container,
  SidebarLayout,
  SidebarList,
  SidebarNavLink,
  SidebarTitle,
} from "@argos-ci/app/src/components";

import { Query } from "../../containers/Apollo";
import { hasWritePermission } from "../../modules/permissions";
import { NotFound, NotFoundWithContainer } from "../NotFound";
import { GeneralSettings, OwnerSettingsFragment } from "./GeneralSettings";
import { OwnerTabs } from "./OwnerTabs";
import {
  OwnerPermissionsSettingsFragment,
  PermissionsSettings,
} from "./PermissionsSettings";

function SettingsSidebar({ owner }) {
  return (
    <SidebarList>
      <SidebarTitle>Organization settings</SidebarTitle>
      <SidebarNavLink to="" exact>
        General
      </SidebarNavLink>
      {hasWritePermission(owner) ? (
        <SidebarNavLink to="permissions" exact>
          Repositories Permissions
        </SidebarNavLink>
      ) : null}
    </SidebarList>
  );
}

export function OwnerSettings() {
  const { ownerLogin } = useParams();

  return (
    <Container>
      <Helmet>
        <title>{ownerLogin} • Settings</title>
      </Helmet>

      <Query
        query={gql`
          query OWNER_SETTINGS_QUERY($login: String!) {
            owner(login: $login) {
              id
              permissions
              ...OwnerSettingsFragment
              ...OwnerPermissionsSettingsFragment
            }
          }

          ${OwnerSettingsFragment}
          ${OwnerPermissionsSettingsFragment}
        `}
        variables={{ login: ownerLogin }}
      >
        {({ owner }) => {
          if (!owner) return <NotFoundWithContainer />;

          return (
            <>
              <OwnerTabs />
              <SidebarLayout>
                <SettingsSidebar owner={owner} />

                <Routes>
                  <Route index element={<GeneralSettings owner={owner} />} />
                  {hasWritePermission(owner) ? (
                    <Route
                      path="permissions"
                      element={<PermissionsSettings owner={owner} />}
                    />
                  ) : null}
                  <Route path="*" element={<NotFound mx={-3} my={0} />} />
                </Routes>
              </SidebarLayout>
            </>
          );
        }}
      </Query>
    </Container>
  );
}
