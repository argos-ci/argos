import React from "react";
import { Helmet } from "react-helmet";
import { Box } from "@smooth-ui/core-sc";
import { Container } from "../../components";
import { RouterSidebarItem, SidebarList } from "../../components/Sidebar";
import { Route, Switch } from "react-router-dom";
import { NotFound } from "../NotFound";
import { GeneralSettings } from "./GeneralSettings";
import { PermissionsSettings } from "./PermissionsSettings";
import { hasWritePermission } from "../../modules/permissions";
import { useOwner } from "./OwnerContext";

export function OwnerSettings({ match: { url } }) {
  const owner = useOwner();

  return (
    <Container>
      <Helmet>
        <title>Settings</title>
      </Helmet>

      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        mt={4}
        mx={-4}
      >
        <SidebarList px={4}>
          <RouterSidebarItem exact to={`${url}`}>
            General
          </RouterSidebarItem>
          {hasWritePermission(owner) ? (
            <RouterSidebarItem exact to={`${url}/permissions`}>
              Repositories Permissions
            </RouterSidebarItem>
          ) : null}
        </SidebarList>

        <Box px={4} flex={1}>
          <Switch>
            <Route exact path={`${url}`}>
              <GeneralSettings />
            </Route>
            {hasWritePermission(owner) ? (
              <Route path={`${url}/permissions`}>
                <PermissionsSettings />
              </Route>
            ) : null}
            <Route>
              <NotFound mx={-3} my={0} />
            </Route>
          </Switch>
        </Box>
      </Box>
    </Container>
  );
}
