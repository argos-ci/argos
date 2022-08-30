/* eslint-disable react/no-unescaped-entities */
import * as React from "react";
import { gql } from "graphql-tag";
import { x } from "@xstyled/styled-components";
import { Query } from "../../containers/Apollo";
import {
  Container,
  SecondaryTitle,
  Link,
  Loader,
} from "@argos-ci/app/src/components";
import config from "../../config";
import { useParams } from "react-router-dom";
import {
  ActiveRepositoryCard,
  InactiveRepositoryCard,
  NoRepositoryCard,
  OwnerRepositoryCardFragment,
} from "./RepositoryCard";
import { NotFound } from "../NotFound";
import { OwnerTabs } from "./OwnerTabs";
import { Helmet } from "react-helmet";
import { LinkExternalIcon } from "@primer/octicons-react";

const getRepositoryUrl = (owner, repository) =>
  `/${owner.login}/${repository.name}`;

export function OwnerRepositories() {
  const { ownerLogin } = useParams();

  return (
    <Container>
      <Helmet>
        <title>{ownerLogin}</title>
      </Helmet>

      <Query
        query={gql`
          query OwnerRepositories($login: String!) {
            owner(login: $login) {
              id
              name
              login
              repositories {
                id
                enabled
                name
                ...OwnerRepositoryCardFragment
              }
            }
          }

          ${OwnerRepositoryCardFragment}
        `}
        variables={{ login: ownerLogin }}
        fetchPolicy="no-cache"
        fallback={<Loader />}
      >
        {({ owner }) => {
          if (!owner) return <NotFound />;

          const activeRepositories = owner.repositories.filter(
            ({ enabled }) => enabled
          );

          const inactiveRepositories = owner.repositories.filter(
            ({ enabled }) => !enabled
          );

          return (
            <>
              <OwnerTabs />

              <x.div display="flex" flexDirection="column">
                <SecondaryTitle id="active-repositories">
                  Active repositories
                </SecondaryTitle>

                <x.div display="flex" flexDirection="column" gap={4}>
                  {activeRepositories.length === 0 ? (
                    <NoRepositoryCard />
                  ) : (
                    activeRepositories.map((repository) => (
                      <ActiveRepositoryCard
                        key={repository.id}
                        repository={repository}
                        url={getRepositoryUrl(owner, repository)}
                      />
                    ))
                  )}
                </x.div>

                <SecondaryTitle id="inactive-repositories" mt={8}>
                  Inactive repositories
                </SecondaryTitle>

                <x.div display="flex" flexDirection="column" gap={3}>
                  {inactiveRepositories.length === 0 ? (
                    <NoRepositoryCard />
                  ) : (
                    inactiveRepositories.map((repository) => (
                      <InactiveRepositoryCard
                        key={repository.id}
                        repository={repository}
                        url={getRepositoryUrl(owner, repository)}
                      />
                    ))
                  )}
                </x.div>
              </x.div>

              <x.div mt={14}>
                Don't see your repo? Click here to{" "}
                <Link href={config.get("github.appUrl")} target="_blank">
                  manage access restrictions on GitHub <LinkExternalIcon />
                </Link>
              </x.div>
            </>
          );
        }}
      </Query>
    </Container>
  );
}
