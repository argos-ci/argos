/* eslint-disable react/no-unescaped-entities */
import { LinkExternalIcon } from "@primer/octicons-react";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { Container, Link, Loader, SecondaryTitle } from "@/components";
import config from "@/config";
import { Query } from "@/containers/Apollo";
import { useUser } from "@/containers/User";
import { NotFound } from "@/pages/NotFound";

import { OwnerTabs } from "./OwnerTabs";
import {
  ActiveRepositoryCard,
  InactiveRepositoryCard,
  NoRepositoryCard,
  OwnerRepositoryCardFragment,
} from "./RepositoryCard";

const getRepositoryUrl = (owner, repository) =>
  `/${owner.login}/${repository.name}`;

export function OwnerRepositories() {
  const { ownerLogin } = useParams();
  const user = useUser();

  return (
    <Container>
      <Helmet>
        <title>{ownerLogin}</title>
      </Helmet>

      <Query
        query={gql`
          query OWNER_REPOSITORIES_QUERY($login: String!) {
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

              <SecondaryTitle id="active-repositories">
                Repositories
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

              {user ? (
                <>
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
                </>
              ) : null}

              <x.div mt={10}>
                Don't see your repo?{" "}
                {user ? (
                  <>
                    Click here to{" "}
                    <Link href={config.get("github.appUrl")} target="_blank">
                      manage access restrictions on GitHub <LinkExternalIcon />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={`${config.get("github.loginUrl")}&redirect_uri=${
                        window.location.origin
                      }/auth/github/callback?r=${encodeURIComponent(
                        window.location.pathname
                      )}`}
                    >
                      Login
                    </Link>{" "}
                    to show the inactive repositories.
                  </>
                )}
              </x.div>
            </>
          );
        }}
      </Query>
    </Container>
  );
}
