import React from "react";
import { Helmet } from "react-helmet";
import {
  Container,
  SidebarNavLink,
  SidebarList,
  SidebarTitle,
  SidebarLayout,
} from "@argos-ci/app/src/components";
import { Route, Routes } from "react-router-dom";
import { NotFound } from "../NotFound";
import { GeneralSettings } from "./GeneralSettings";
import { PermissionsSettings } from "./PermissionsSettings";
import { hasWritePermission } from "../../modules/permissions";
import { useOwner } from "../../containers/OwnerContext";
import { OwnerTabs } from ".";

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
  const { owner } = useOwner();
  if (!owner) return <NotFound />;

  return (
    <Container>
      <Helmet>
        <title>{`Settings • ${owner.login}`}</title>
      </Helmet>

      <OwnerTabs owner={owner} />

      <SidebarLayout>
        <SettingsSidebar owner={owner} />

        <Routes>
          <Route index element={<GeneralSettings />} />
          {hasWritePermission(owner) ? (
            <Route path="permissions" element={<PermissionsSettings />} />
          ) : null}
          <Route path="*" element={<NotFound mx={-3} my={0} />} />
        </Routes>
      </SidebarLayout>
    </Container>
  );
}
