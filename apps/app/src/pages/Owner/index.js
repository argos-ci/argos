import React from "react";
import { Helmet } from "react-helmet";

import {
  TabList,
  TabNavLink,
  Container,
  FadeLink,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
} from "@argos-ci/app/src/components";
import { OwnerRepositories } from "./Repositories";
import { useOwner } from "../../containers/OwnerContext";
import { HeaderTeleporter } from "../../containers/AppNavbar";

export function OwnerNotFound() {
  return (
    <Container textAlign="center" my={4}>
      <Card>
        <CardHeader>
          <CardTitle>Not Found</CardTitle>
        </CardHeader>
        <CardBody>
          <CardText>Organization or user not found.</CardText>
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
  if (!owner) return <OwnerNotFound />;

  return (
    <>
      <Helmet
        titleTemplate={`%s - ${owner.login}`}
        defaultTitle={owner.login}
      />
      <OwnerTabs owner={owner} />

      <OwnerRepositories />
    </>
  );
}
