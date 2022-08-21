import React from "react";
import { Helmet } from "react-helmet";
import { TabList, TabNavLink } from "@argos-ci/app/src/components";
import { OwnerRepositories } from "./Repositories";
import { useOwner } from "../../containers/OwnerContext";
import { HeaderTeleporter } from "../../containers/AppNavbar";
import { NotFound } from "../NotFound";

export function OwnerTabs({ owner }) {
  return (
    <HeaderTeleporter>
      <TabList>
        <TabNavLink exact to={`/${owner.login}`}>
          Repositories
        </TabNavLink>
        <TabNavLink to={`/${owner.login}/settings`}>Settings</TabNavLink>
      </TabList>
    </HeaderTeleporter>
  );
}

export function Owner() {
  const { owner } = useOwner();
  if (!owner) return <NotFound />;

  return (
    <>
      <Helmet
        titleTemplate={`%s • ${owner.login}`}
        defaultTitle={owner.login}
      />

      <OwnerTabs owner={owner} />

      <OwnerRepositories />
    </>
  );
}
