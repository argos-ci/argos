import React from "react";
import { gql } from "graphql-tag";
import { x } from "@xstyled/styled-components";
import { GoGear, GoRepo } from "react-icons/go";
import { FaRegImages } from "react-icons/fa";
import moment from "moment";
import { Query } from "../../containers/Apollo";
import { StatusIcon } from "../../containers/StatusIcon";
import {
  useOwner,
  OwnerRepositoriesFragment,
} from "../../containers/OwnerContext";
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  SecondaryTitle,
  Link,
  PrimaryTitle,
  TagButton,
  SidebarList,
  SidebarItemLink,
  SidebarItem,
  SidebarTitle,
  CardText,
  SidebarLayout,
  DocumentationLinkPhrase,
  BaseLink,
} from "@argos-ci/app/src/components";
import { useUser } from "../../containers/User";
import config from "../../config";
import { getPossessiveForm } from "../../modules/utils";

const OWNER_REPOSITORIES_QUERY = gql`
  query OwnerRepositories($login: String!) {
    owner(login: $login) {
      ...OwnerRepositoriesFragment
    }
  }

  ${OwnerRepositoriesFragment}
`;

const Stat = (props) => (
  <x.div
    display="flex"
    flexDirection={{ _: "row", md: "column" }}
    justifyContent="space-between"
    alignItems="center"
    {...props}
  />
);

const StatLabel = (props) => (
  <x.div
    color="text-secondary"
    fontWeight={600}
    pl={3}
    whiteSpace="nowrap"
    flex={1}
    {...props}
  />
);

const StatValue = (props) => <x.div {...props} px={3} flex={1} />;

const RepositoryStats = ({ buildCount, lastBuild, ...props }) => {
  return (
    <x.div {...props}>
      <x.div
        display="grid"
        gridTemplateColumns={{ _: 1, md: 3 }}
        divideX
        divideColor="border"
      >
        <Stat>
          <StatLabel>Build count</StatLabel>
          <StatValue>{buildCount}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Last build date</StatLabel>
          <StatValue>{moment(lastBuild.updatedAt).fromNow()}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Last build status</StatLabel>
          <StatValue display="flex" gap={1}>
            <StatusIcon
              verticalAlign="text-bottom"
              status={lastBuild.status}
              mt={1}
            />
            {lastBuild.status}
          </StatValue>
        </Stat>
      </x.div>
    </x.div>
  );
};

function ActiveRepositoryCard({ repository, url, ...props }) {
  const {
    pageInfo: { totalCount },
    edges: [lastBuild],
  } = repository.builds;

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle display="flex" alignItems="center" gap={2}>
          <x.svg as={GoRepo} mt={1} />
          <Link color="white" to={`${url}/builds`}>
            {repository.name}
          </Link>
        </CardTitle>

        <TagButton variant="neutral" as={BaseLink} to={`${url}/builds`}>
          <x.svg as={FaRegImages} />
          Builds
        </TagButton>
      </CardHeader>
      <CardBody>
        {!lastBuild ? (
          <>
            <CardText fontWeight={600} fontSize="md">
              No Build found.
            </CardText>
            <CardText mt={1} fontWeight={400}>
              <DocumentationLinkPhrase />
            </CardText>
          </>
        ) : (
          <RepositoryStats buildCount={totalCount} lastBuild={lastBuild} />
        )}
      </CardBody>
    </Card>
  );
}

function InactiveRepositoryCard({ repository, url, ...props }) {
  return (
    <Card {...props}>
      <CardHeader border={0}>
        <CardTitle display="flex" alignItems="flex-start" gap={2}>
          <x.svg as={GoRepo} mt={1} />
          <Link color="secondary-text" to={`${url}/builds`}>
            {repository.name}
          </Link>
        </CardTitle>
        <TagButton variant="neutral" as={BaseLink} to={`${url}/settings`}>
          <x.svg as={GoGear} />
          Settings
        </TagButton>
      </CardHeader>
    </Card>
  );
}

function NoRepositoryCard() {
  return (
    <Card>
      <CardHeader border={0}>
        <CardTitle>No repository found</CardTitle>
      </CardHeader>
    </Card>
  );
}

const getRepositoryUrl = (owner, repository) =>
  `/${owner.login}/${repository.name}`;

export function OwnerRepositories() {
  const { owner } = useOwner();
  const user = useUser();
  if (!owner) return null;

  return (
    <Container>
      <SidebarLayout>
        <SidebarList>
          <SidebarTitle>Organization repositories</SidebarTitle>
          <SidebarItem>
            <SidebarItemLink href="#active-repositories">
              Active
            </SidebarItemLink>
          </SidebarItem>
          <SidebarItem>
            <SidebarItemLink href="#inactive-repositories" exact>
              Inactive
            </SidebarItemLink>
          </SidebarItem>
        </SidebarList>

        <SidebarLayout.PageTitle>
          <PrimaryTitle>
            {user.login === owner.login
              ? "Personal"
              : getPossessiveForm(owner.name)}{" "}
            repositories
          </PrimaryTitle>
        </SidebarLayout.PageTitle>

        <SidebarLayout.PageContent>
          <Query
            query={OWNER_REPOSITORIES_QUERY}
            variables={{ login: owner.login }}
            fetchPolicy="no-cache"
          >
            {({ owner: { repositories } }) => {
              const activeRepositories = repositories.filter(
                (repository) => repository.enabled
              );

              const inactiveRepositories = repositories.filter(
                (repository) => !repository.enabled
              );

              return (
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
              );
            }}
          </Query>

          <x.div mt={14}>
            Don’t see your repo? Click here to{" "}
            <Link
              href={config.get("github.appUrl")}
              target="_blank"
              rel="noopener noreferrer"
              fontWeight="normal"
            >
              manage access restrictions →
            </Link>
          </x.div>
        </SidebarLayout.PageContent>
      </SidebarLayout>
    </Container>
  );
}
