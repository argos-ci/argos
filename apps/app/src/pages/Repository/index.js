import React from "react";
import { Helmet } from "react-helmet";
import { Navigate, Route, Routes } from "react-router-dom";
import { TabList, TabNavLink } from "@argos-ci/app/src/components";
import { useRepository } from "../../containers/RepositoryContext";
import { RepositoryBuilds } from "./Builds";
import { RepositorySettings } from "./Settings";
import { Build } from "../Build";
import { GettingStarted } from "./GettingStarted";
import { NotFound } from "../NotFound";
import { HeaderTeleporter } from "../../containers/AppNavbar";

function hasWritePermission(repository) {
  return repository.permissions.includes("write");
}

export function Repository() {
  const { repository } = useRepository();
  if (!repository) return <NotFound />;

  return (
    <>
      <Helmet
        titleTemplate={`%s • ${repository.owner.login} / ${repository.name}`}
        defaultTitle={`${repository.owner.login} / ${repository.name}`}
      />

      <HeaderTeleporter>
        <TabList>
          <TabNavLink to={`builds`}>Builds</TabNavLink>
          {hasWritePermission(repository) ? (
            <TabNavLink to={`settings`}>Settings</TabNavLink>
          ) : null}
        </TabList>
      </HeaderTeleporter>

      <Routes>
        <Route path={`builds/:buildNumber`} element={<Build />} />
        <Route path={"builds"} element={<RepositoryBuilds />} />
        <Route index element={<Navigate to="builds" replace />} />
        <Route path={`getting-started`} element={<GettingStarted />} />
        {hasWritePermission(repository) ? (
          <Route path={`settings`} element={<RepositorySettings />} />
        ) : null}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
