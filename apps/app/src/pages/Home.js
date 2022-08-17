/* eslint-disable react/no-unescaped-entities */
import React, { useState } from "react";
import { gql } from "graphql-tag";
import { Group } from "reakit/Group";
import { Button } from "@smooth-ui/core-sc";
import { Box } from "@xstyled/styled-components";
import { Query } from "../containers/Apollo";
import { useUser } from "../containers/User";
import { isUserSyncing } from "../modules/user";
import config from "../config";
import {
  Container,
  HeaderBody,
  HeaderPrimary,
  HeaderBreadcrumb,
  Header,
  Link,
} from "../components";
import { Loader } from "../components/Loader";
import { HomeBreadcrumbItem } from "./Owner/HeaderBreadcrumb";
import { getStatusColor } from "../modules/build";
import { FaCamera, FaExternalLinkAlt } from "react-icons/fa";
import { Table, Tbody, Td, Th, Thead, Tr } from "../components/Table";
import { Tag } from "../components/Tag";

function AppHeader() {
  return (
    <Header>
      <HeaderBody>
        <HeaderPrimary>
          <HeaderBreadcrumb>
            <HomeBreadcrumbItem showTitle />
          </HeaderBreadcrumb>
        </HeaderPrimary>
      </HeaderBody>
    </Header>
  );
}

function Owners({ data: { owners }, user }) {
  const [activeFilter, setActiveFilter] = useState(true);

  return (
    <>
      <AppHeader user={user} />

      <Container mt={1}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="baseline"
          gridGap={4}
        >
          <Box my={3}>
            Don’t see your repo?{" "}
            <Link
              forwardedAs="a"
              href={config.get("github.appUrl")}
              target="_blank"
              rel="noopener noreferrer"
              fontWeight="normal"
            >
              Manage access restrictions{" "}
              <Box as={FaExternalLinkAlt} width={10} height={10} />
            </Link>{" "}
            or{" "}
            <Link onClick={() => window.location.reload()}>
              reload the page
            </Link>
            .
          </Box>
          <Box as={Group} display="flex">
            <Button
              borderRadius="base 0 0 base"
              variant={activeFilter ? "dark" : "primary"}
              disabled={activeFilter}
              onClick={() => setActiveFilter(true)}
            >
              Active only
            </Button>
            <Button
              borderRadius="0 base base 0"
              variant={activeFilter ? "primary" : "dark"}
              disabled={!activeFilter}
              onClick={() => setActiveFilter(false)}
            >
              Display all
            </Button>
          </Box>
        </Box>
        <Table mt={1}>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th width={120}>Last Build</Th>
              <Th width={80}></Th>
              <Th width={120}>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {owners.map((owner) =>
              owner.repositories
                .filter(({ enabled }) => !activeFilter || enabled)
                .map((repository) => (
                  <Tr key={`${owner.login}-${repository.name}`}>
                    <Td color="secondary">
                      <Link color="secondary" to={`/${owner.login}`}>
                        {owner.name || owner.login}
                      </Link>{" "}
                      /{" "}
                      <Link
                        color="darker"
                        fontWeight={600}
                        to={`/${owner.login}/${repository.name}/builds`}
                      >
                        {repository.name}
                      </Link>
                    </Td>
                    <Td>
                      {repository.lastBuild ? (
                        <Box display="flex" gridGap={2} flexWrap="wrap">
                          <Tag
                            as={Link}
                            to={`/${owner.login}/${repository.name}/build/${repository.lastBuild.number}`}
                            color="darker"
                          >
                            <Box
                              as={FaCamera}
                              color={getStatusColor(
                                repository.lastBuild.status
                              )}
                              width={16}
                              height={16}
                              mb="-2px"
                              mr={2}
                              ml="3px"
                            />
                            #{repository.lastBuild.number.toLocaleString()}
                          </Tag>
                        </Box>
                      ) : (
                        <Box pl={2}>-</Box>
                      )}
                    </Td>
                    <Td>
                      {repository.lastBuild
                        ? new Date(
                            repository.lastBuild.updatedAt
                          ).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                          })
                        : null}
                    </Td>
                    <Td pr={20}>
                      {repository.enabled ? "Active" : "Deactivated"}
                    </Td>
                  </Tr>
                ))
            )}
          </Tbody>
        </Table>
      </Container>
    </>
  );
}

const RedirectToWww = () => {
  React.useEffect(() => {
    window.location = "https://www.argos-ci.com";
  }, []);
  return null;
};

export function Home() {
  const user = useUser();
  if (!user) {
    if (process.env.NODE_ENV !== "production") {
      return (
        <Container textAlign="center" my={4}>
          Not logged in, in production you would be redirected to
          www.argos-ci.com.
        </Container>
      );
    }
    return <RedirectToWww />;
  }

  if (!user.installations.length && !isUserSyncing(user)) {
    return (
      <Container textAlign="center" my={4}>
        <p>Look like you don't have installed Argos GitHub App.</p>
        <Button as="a" href={config.get("github.appUrl")}>
          Install Argos GitHub App
        </Button>
      </Container>
    );
  }

  return (
    <Query
      fallback={
        <Container my={3} textAlign="center">
          <Loader />
        </Container>
      }
      query={gql`
        query Owners {
          owners {
            name
            login
            type
            repositories {
              id
              name
              enabled
              lastBuild {
                id
                updatedAt
                status
                number
              }
            }
          }
        }
      `}
    >
      {(data) => <Owners data={data} user={user} />}
    </Query>
  );
}
