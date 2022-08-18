import React from "react";
import { Helmet } from "react-helmet";
import { Route, Routes } from "react-router-dom";
import {
  TabList,
  TabNavLink,
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  FadeLink,
} from "@argos-ci/app/src/components";
import { useRepository } from "../../containers/RepositoryContext";
import { RepositoryBuilds } from "./Builds";
import { RepositorySettings } from "./Settings";
import { BuildDetail } from "./BuildDetail/index";
import { GettingStarted } from "./GettingStarted";
import { NotFound } from "../NotFound";
import { HeaderTeleporter } from "../../containers/AppNavbar";

function hasWritePermission(repository) {
  return repository.permissions.includes("write");
}

export function RepositoryNotFound() {
  return (
    <Container textAlign="center" my={4}>
      <Card>
        <CardHeader>
          <CardTitle>Not Found</CardTitle>
        </CardHeader>
        <CardBody>
          <CardText>Repository not found.</CardText>
          <CardText>
            <FadeLink color="white" to="/">
              Back to home
            </FadeLink>
          </CardText>
        </CardBody>
      </Card>
    </Container>
  );
}

export function Repository() {
  const { repository } = useRepository();
  if (!repository) return <RepositoryNotFound />;

  return (
    <>
      <Helmet
        titleTemplate={`%s - ${repository.owner.login}/${repository.name}`}
        defaultTitle={`${repository.owner.login}/${repository.name}`}
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
        <Route path={`builds/:buildNumber(\\d+)`} element={<BuildDetail />} />
        <Route path={`builds`} element={<RepositoryBuilds />} />
        <Route path={`getting-started`} element={<GettingStarted />} />
        {hasWritePermission(repository) ? (
          <Route path={`settings`} element={<RepositorySettings />} />
        ) : null}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
