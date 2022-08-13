import React from "react";
import { gql } from "graphql-tag";
import { Route, Link } from "react-router-dom";
import { Box } from "@xstyled/styled-components";
import { FaGithub } from "react-icons/fa";
import { Helmet } from "react-helmet";
import {
  Header,
  HeaderBody,
  HeaderTitle,
  HeaderPrimary,
  HeaderSecondaryLink,
  TabList,
  RouterTabItem,
  Container,
  FadeLink,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
} from "../../components";
import { Query } from "../../containers/Apollo";
import { OwnerAvatar } from "../../containers/OwnerAvatar";
import { OwnerProvider, useOwner } from "./OwnerContext";
import { OwnerRepositories } from "./Repositories";
import { OwnerSettings } from "./Settings";

function OwnerHeader() {
  const owner = useOwner();
  return (
    <Header>
      <HeaderBody>
        <HeaderPrimary>
          <HeaderTitle>
            <OwnerAvatar owner={owner} mr={2} />
            {owner.login}
          </HeaderTitle>
          <HeaderSecondaryLink
            target="_blank"
            rel="noopener noreferrer"
            href={`https://github.com/${owner.login}`}
          >
            <Box forwardedAs={FaGithub} mr={1} /> {owner.login}
          </HeaderSecondaryLink>
        </HeaderPrimary>
        <TabList>
          <RouterTabItem exact to={`/${owner.login}`}>
            Repositories
          </RouterTabItem>
          <RouterTabItem to={`/${owner.login}/settings`}>
            Settings
          </RouterTabItem>
        </TabList>
      </HeaderBody>
    </Header>
  );
}

export function Owner({
  match: {
    params: { ownerLogin },
  },
}) {
  return (
    <Query
      query={gql`
        query Owner($login: String!) {
          owner(login: $login) {
            id
            name
            login
            permissions
            purchases {
              id
              startDate
              endDate
              plan {
                id
                name
                screenshotsLimitPerMonth
              }
            }
            currentMonthUsedScreenshots
          }
        }
      `}
      variables={{ login: ownerLogin }}
      fetchPolicy="no-cache"
    >
      {({ owner }) => {
        if (!owner) {
          return (
            <Container textAlign="center" my={4}>
              <Card>
                <CardHeader>
                  <CardTitle>Not Found</CardTitle>
                </CardHeader>
                <CardBody>
                  <CardText>Organization or user not found.</CardText>
                  <CardText>
                    <FadeLink forwardedAs={Link} color="darker" to="/">
                      Back to home
                    </FadeLink>
                  </CardText>
                </CardBody>
              </Card>
            </Container>
          );
        }

        return (
          <OwnerProvider owner={owner}>
            <>
              <Helmet
                titleTemplate={`%s - ${owner.login}`}
                defaultTitle={owner.login}
              />
              <OwnerHeader />
              <Route
                exact
                path={`/${owner.login}`}
                component={OwnerRepositories}
              />
              <Route
                path={`/${owner.login}/settings`}
                component={OwnerSettings}
              />
            </>
          </OwnerProvider>
        );
      }}
    </Query>
  );
}
