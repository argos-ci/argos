import * as React from "react";
import { TabList, TabNavLink } from "@argos-ci/app/src/components";
import { useParams } from "react-router-dom";
import { HeaderTeleporter } from "../../containers/AppHeader";

export function OwnerTabs() {
  const { ownerLogin } = useParams();

  return (
    <HeaderTeleporter>
      <TabList>
        <TabNavLink exact to={`/${ownerLogin}`}>
          Repositories
        </TabNavLink>
        <TabNavLink to={`/${ownerLogin}/settings`}>Settings</TabNavLink>
      </TabList>
    </HeaderTeleporter>
  );
}
