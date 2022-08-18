/* eslint-disable react/no-unescaped-entities */
import React, { useState } from "react";
import { gql } from "graphql-tag";
import { Link as ReactRouterLink } from "react-router-dom";
import { Group } from "ariakit/group";
import { x } from "@xstyled/styled-components";
import { Query } from "../containers/Apollo";
import { useUser } from "../containers/User";
import { isUserSyncing } from "../modules/user";
import config from "../config";
import {
  Button,
  Container,
  Loader,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Link,
  MenuButton,
  useMenuState,
  Menu,
  MenuItem,
  MenuIcon,
  IconLink,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
} from "@argos-ci/app/src/components";
import { Tag, TagButton } from "../components/Tag";
import { FaCamera, FaEllipsisH, FaExternalLinkAlt } from "react-icons/fa";
import { getVariantColor } from "../modules/utils";
import { GoKey, GoGear } from "react-icons/go";
import { OwnerAvatar } from "../containers/OwnerAvatar";
import { OwnerRepositoriesFragment } from "../containers/OwnerContext";

const OWNERS_REPOSITORIES_QUERY = gql`
  query Owners {
    owners {
      ...OwnerRepositoriesFragment
    }
  }

  ${OwnerRepositoriesFragment}
`;

function RepositoryNameCell({
  owner,
  repositoryName,
  repositoryUrl,
  ...props
}) {
  return (
    <Td color="secondary-text" {...props}>
      <Link color="secondary-text" to={`/${owner.login}`}>
        <OwnerAvatar
          owner={owner}
          size="sm"
          display="inline-block"
          mr={2}
          mt={-0.5}
        />
        {owner.login}
      </Link>{" "}
      /{" "}
      <Link color="white" fontWeight={600} to={`${repositoryUrl}/builds`}>
        {repositoryName}
      </Link>
    </Td>
  );
}

function ActionsMenuCell({ repositoryUrl }) {
  const menu = useMenuState({ placement: "bottom-end", gutter: 4 });
  return (
    <Td>
      <TagButton as={MenuButton} state={menu}>
        <x.svg as={FaEllipsisH} />
      </TagButton>
      <Menu aria-label="User settings" state={menu}>
        <MenuItem
          state={menu}
          as={ReactRouterLink}
          to={`${repositoryUrl}/setting`}
        >
          <MenuIcon as={GoKey} />
          Get token
        </MenuItem>
        <MenuItem
          state={menu}
          as={ReactRouterLink}
          to={`${repositoryUrl}/setting`}
        >
          <MenuIcon as={GoGear} />
          Settings
        </MenuItem>
      </Menu>
    </Td>
  );
}

function BuildTagCell({ build, repositoryUrl, ...props }) {
  if (!build) return <Td>-</Td>;

  return (
    <Td>
      <TagButton
        as={ReactRouterLink}
        to={`${repositoryUrl}/builds/${build.number}`}
        gap={2}
        {...props}
      >
        {console.log(build)}
        <x.svg
          as={FaCamera}
          color={getVariantColor(build.status)}
          w={4}
          h={4}
        />
        #{build.number.toLocaleString()}
      </TagButton>
    </Td>
  );
}

function DateCell({ date }) {
  if (!date) return <Td />;

  return (
    <Td fontSize="sm">
      {new Date(date).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })}
    </Td>
  );
}

function RepositoriesList({ repositories, ...props }) {
  if (repositories.length === 0) {
    return (
      <Card mt={3}>
        <CardHeader>
          <CardTitle>No repository found</CardTitle>
        </CardHeader>
        <CardBody>
          <CardText fontSize="md" mb={3}>
            Argos uses OAuth GitHub App.
          </CardText>
          <CardText fontSize="md">
            Click on{" "}
            <IconLink
              href={config.get("github.appUrl")}
              target="_blank"
              rel="noopener noreferrer"
              fontWeight="normal"
              icon={FaExternalLinkAlt}
            >
              this link
            </IconLink>
            to manage the repositories’ access restrictions.
          </CardText>
        </CardBody>
      </Card>
    );
  }

  return (
    <Table {...props}>
      <Thead>
        <Tr>
          <Th>Repository name</Th>
          <Th width={120}>Last Build</Th>
          <Th width={70}></Th>
          <Th width={120}>Status</Th>
          <Th width={80}>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {repositories.map(({ owner, ...repository }) => {
          const repositoryUrl = `/${owner.login}/${repository.name}`;
          const lastBuild = repository.builds?.edges?.[0];

          return (
            <Tr key={`${owner.login}-${repository.name}`}>
              <RepositoryNameCell
                owner={owner}
                repositoryName={repository.name}
                repositoryUrl={repositoryUrl}
              />
              <BuildTagCell build={lastBuild} repositoryUrl={repositoryUrl} />
              <DateCell date={lastBuild?.updatedAt || repository.updatedAt} />
              <Td>
                <Tag color={repository.enabled ? "white" : "secondary-text"}>
                  {repository.enabled ? "Active" : "Deactivated"}
                </Tag>
              </Td>
              <ActionsMenuCell repositoryUrl={repositoryUrl} />
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}

function Owners({ data: { owners } }) {
  const repositories = owners.flatMap((owner) =>
    owner.repositories.map((repository) => ({ owner, ...repository }))
  );

  const activeRepositories = repositories.filter(({ enabled }) => enabled);

  const [activeFilter, setActiveFilter] = useState(
    activeRepositories.length !== 0
  );

  return (
    <Container>
      <x.div
        display="flex"
        justifyContent="space-between"
        alignItems="baseline"
        gap={10}
      >
        <x.div my={3}>
          Don’t see your repo?{" "}
          <IconLink
            href={config.get("github.appUrl")}
            target="_blank"
            rel="noopener noreferrer"
            fontWeight="normal"
            icon={FaExternalLinkAlt}
          >
            Manage access restrictions
          </IconLink>
          or{" "}
          <Link onClick={() => window.location.reload()}>reload the page</Link>.
        </x.div>

        <x.div as={Group} display="flex">
          <Button
            borderRadius="md 0 0 md"
            variant="primary"
            py={2}
            disabled={activeFilter}
            onClick={() => setActiveFilter(true)}
          >
            Active only
          </Button>
          <Button
            py={2}
            borderRadius="0 md md 0"
            variant="primary"
            disabled={!activeFilter}
            onClick={() => setActiveFilter(false)}
          >
            Display all
          </Button>
        </x.div>
      </x.div>

      <RepositoriesList
        repositories={activeFilter ? activeRepositories : repositories}
        mt={2}
      />
    </Container>
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
      query={OWNERS_REPOSITORIES_QUERY}
    >
      {(data) => <Owners data={data} />}
    </Query>
  );
}
