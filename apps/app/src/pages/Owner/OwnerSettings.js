import * as React from "react";
import { Helmet } from "react-helmet";
import { gql } from "graphql-tag";
import {
  Container,
  SidebarNavLink,
  SidebarList,
  SidebarTitle,
  SidebarLayout,
} from "@argos-ci/app/src/components";
import { Route, Routes, useParams } from "react-router-dom";
import { NotFound, NotFoundWithContainer } from "../NotFound";
import { GeneralSettings, OwnerSettingsFragment } from "./GeneralSettings";
import {
  OwnerPermissionsSettingsFragment,
  PermissionsSettings,
} from "./PermissionsSettings";
import { hasWritePermission } from "../../modules/permissions";
import { Query } from "../../containers/Apollo";
import { OwnerTabs } from "./OwnerTabs";

const OWNER_SETTINGS_QUERY = gql`
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
`;

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

      <Query query={OWNER_SETTINGS_QUERY} variables={{ login: ownerLogin }}>
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
