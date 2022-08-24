import React, { useState } from "react";
import { gql } from "graphql-tag";
import { x } from "@xstyled/styled-components";
import { Query } from "../containers/Apollo";
import { useUser } from "../containers/User";
import { isUserSyncing } from "../modules/user";
import config from "../config";
import {
  BaseLink,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardText,
  CardTitle,
  Container,
  Icon,
  Link,
  Loader,
  Menu,
  MenuButton,
  MenuIcon,
  MenuItem,
  MenuSeparator,
  MenuTitle,
  PrimaryTitle,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useMenuState,
  ToggleGroupButtons,
  IllustratedText,
} from "@argos-ci/app/src/components";
import { Tag, TagButton } from "../components/Tag";
import {
  GoThreeBars,
  GoLinkExternal,
  GoKey,
  GoGear,
  GoLock,
} from "react-icons/go";
import { getVariantColor } from "../modules/utils";
import { OwnerAvatar } from "../containers/OwnerAvatar";
import { hasWritePermission } from "../modules/permissions";

const OWNERS_REPOSITORIES_QUERY = gql`
  query Owners {
    owners {
      id
      name
      login
      type
      repositories {
        id
        name
        updatedAt
        enabled
        permissions
        builds(first: 1, after: 0) {
          pageInfo {
            totalCount
          }
          edges {
            id
            updatedAt
            status
            number
          }
        }
      }
    }
  }
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

function ActionsMenuCell({ repository, repositoryUrl }) {
  const menu = useMenuState({ placement: "bottom-end", gutter: 4 });

  if (!hasWritePermission(repository))
    return (
      <Td>
        <Tag display="block" py={1} color="text-secondary">
          <Icon as={GoLock} />
        </Tag>
      </Td>
    );

  return (
    <Td>
      <TagButton as={MenuButton} state={menu}>
        <Icon as={GoThreeBars} />
      </TagButton>
      <Menu aria-label="User settings" state={menu}>
        <MenuTitle>Repositories actions</MenuTitle>
        <MenuSeparator />
        <MenuItem
          state={menu}
          as={BaseLink}
          to={`${repositoryUrl}/settings#argos-token`}
        >
          <MenuIcon as={GoKey} />
          Get token
        </MenuItem>
        <MenuItem state={menu} as={BaseLink} to={`${repositoryUrl}/settings`}>
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
        as={BaseLink}
        to={`${repositoryUrl}/builds/${build.number}`}
        gap={2}
        borderColor={getVariantColor(build.status)}
        {...props}
      >
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
            <IllustratedText
              as={Link}
              reverse
              href={config.get("github.appUrl")}
              target="_blank"
              fontWeight="normal"
              icon={GoLinkExternal}
            >
              this link
            </IllustratedText>{" "}
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
              <ActionsMenuCell
                repository={repository}
                repositoryUrl={repositoryUrl}
              />
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}

function Owners({ owners }) {
  const repositories = owners.flatMap((owner) =>
    owner.repositories.map((repository) => ({ owner, ...repository }))
  );

  const activeRepositories = repositories.filter(({ enabled }) => enabled);

  const [activeFilter, setActiveFilter] = useState(
    activeRepositories.length !== 0
  );

  return (
    <Container>
      <PrimaryTitle>Organizations and repositories</PrimaryTitle>

      <x.div
        display="flex"
        justifyContent="space-between"
        alignItems="baseline"
        gap={10}
      >
        <x.div>
          Don’t see your repo?{" "}
          <IllustratedText
            as={Link}
            reverse
            href={config.get("github.appUrl")}
            target="_blank"
            fontWeight="normal"
            icon={GoLinkExternal}
          >
            Manage access restrictions
          </IllustratedText>{" "}
          or{" "}
          <Link onClick={() => window.location.reload()}>reload the page</Link>.
        </x.div>

        <ToggleGroupButtons
          state={activeFilter}
          setState={setActiveFilter}
          switchOnText="Active only"
          switchOffText="Display all"
        />
      </x.div>
      <RepositoriesList
        repositories={activeFilter ? activeRepositories : repositories}
        mt={3}
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
        <p>Look like you don’t have installed Argos GitHub App.</p>
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
      {({ owners }) => <Owners owners={owners} />}
    </Query>
  );
}
