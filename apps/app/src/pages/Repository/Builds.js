import React from "react";
import { x } from "@xstyled/styled-components";
import { useInView } from "react-cool-inview";
import { GoGitBranch, GoGitCommit, GoClock } from "react-icons/go";
import moment from "moment";
import { gql } from "graphql-tag";
import { getPossessiveForm, getVariantColor } from "../../modules/utils";
import {
  Container,
  Button,
  LoadingAlert,
  Thead,
  Th,
  Table,
  Tbody,
  Td,
  Tr,
  PrimaryTitle,
  Icon,
  LinkBlock,
} from "@argos-ci/app/src/components";
import { useRepository } from "../../containers/RepositoryContext";
import { useQuery } from "../../containers/Apollo";
import { GettingStarted } from "./GettingStarted";

const REPOSITORY_BUILDS_QUERY = gql`
  query RepositoryBuilds($ownerLogin: String!, $name: String!, $after: Int!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $name) {
      id
      builds(first: 5, after: $after) {
        pageInfo {
          totalCount
          hasNextPage
          endCursor
        }
        edges {
          id
          createdAt
          number
          status
          baseScreenshotBucket {
            id
            createdAt
            updatedAt
            name
            commit
            branch
          }
          compareScreenshotBucket {
            id
            createdAt
            updatedAt
            name
            commit
            branch
          }
        }
      }
    }
  }
`;

const TdLink = (props) => (
  <x.a
    as={LinkBlock}
    display="flex"
    color="white"
    gap={2}
    py={4}
    px={2}
    alignItems="center"
    border={1}
    borderColor={{ _: "background", hover: "background-hover" }}
    {...props}
  />
);

const EndOfList = (props) => (
  <x.div
    py={1}
    w={250}
    mx="auto"
    borderTop={1}
    textAlign="center"
    mt={3}
    color="secondary-text"
    {...props}
  >
    End of list
  </x.div>
);

function BuildsList({ repository }) {
  const { loading, data, fetchMore } = useQuery(REPOSITORY_BUILDS_QUERY, {
    variables: {
      ownerLogin: repository.owner.login,
      name: repository.name,
      after: 0,
    },
  });
  const [moreLoading, setMoreLoading] = React.useState();

  function loadNextPage() {
    setMoreLoading(true);
    fetchMore({
      variables: { after: data.repository.builds.pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          ...prev,
          repository: {
            ...prev.repository,
            builds: {
              ...fetchMoreResult.repository.builds,
              edges: [
                ...prev.repository.builds.edges,
                ...fetchMoreResult.repository.builds.edges,
              ],
            },
          },
        };
      },
    }).finally(() => {
      setMoreLoading(false);
    });
  }

  const { observe } = useInView({
    rootMargin: "50px 0px",
    onEnter: ({ unobserve }) => {
      unobserve();
      loadNextPage();
    },
  });

  if (loading)
    return (
      <LoadingAlert>
        Argos fetch <x.span fontWeight={700}>{repository.name}</x.span> builds.
        It should not take long.
      </LoadingAlert>
    );

  const {
    repository: {
      builds: { pageInfo, edges: builds },
    },
  } = data;

  if (!pageInfo.totalCount) {
    return <GettingStarted />;
  }

  return (
    <>
      <Table>
        <Thead>
          <Tr>
            <Th>
              <x.div ml={5}>Branch</x.div>
            </Th>
            <Th width={140}>Build</Th>
            <Th width={130}>Commit</Th>
            <Th width={150}>Date</Th>
          </Tr>
        </Thead>
        <Tbody>
          {builds.map((build, buildIndex) => {
            const statusColor = getVariantColor(build.status);

            return (
              <tr
                key={build.id}
                ref={buildIndex === builds.length - 1 ? observe : null}
              >
                <Td py={2}>
                  <TdLink
                    borderRadius="0 md md 0"
                    borderLeft={1}
                    borderLeftColor={{ _: statusColor, hover: statusColor }}
                    px={4}
                    to={`${build.number}`}
                  >
                    <Icon as={GoGitBranch} w={6} h={6} />
                    {build.compareScreenshotBucket.branch}
                  </TdLink>
                </Td>
                <Td>
                  <TdLink to={`${build.number}`} color={statusColor}>
                    #{build.number} {build.status}
                  </TdLink>
                </Td>
                <Td>
                  <TdLink
                    color={{ _: "secondary-text", hover: "white" }}
                    rel="noopener noreferrer"
                    target="_blank"
                    href={`https://github.com/${repository.owner.login}/${repository.name}/commit/${build.compareScreenshotBucket.commit}`}
                  >
                    <Icon as={GoGitCommit} />
                    {build.compareScreenshotBucket.commit.slice(0, 7)}
                  </TdLink>
                </Td>

                <Td color="secondary-text">
                  <x.div display="flex" gap={2} alignItems="center">
                    <Icon as={GoClock} />
                    {moment(build.createdAt).fromNow()}
                  </x.div>
                </Td>
              </tr>
            );
          })}
        </Tbody>
      </Table>

      {pageInfo.hasNextPage && !moreLoading && (
        <Button mt={3} mx="auto" onClick={loadNextPage}>
          Load More
        </Button>
      )}

      {moreLoading && (
        <LoadingAlert py={1} mt={4} severity="neutral">
          Loading previous build
        </LoadingAlert>
      )}

      {!pageInfo.hasNextPage && <EndOfList />}
    </>
  );
}

export function RepositoryBuilds() {
  const { repository } = useRepository();

  return (
    <Container>
      <PrimaryTitle>{getPossessiveForm(repository.name)} builds</PrimaryTitle>
      <BuildsList repository={repository} />
    </Container>
  );
}
