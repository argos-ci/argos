import * as React from "react";
import { x } from "@xstyled/styled-components";
import {
  GitBranchIcon,
  CommitIcon,
  BookmarkIcon,
} from "@primer/octicons-react";
import moment from "moment";
import { gql } from "graphql-tag";
import {
  BaseLink,
  Button,
  Container,
  IllustratedText,
  Loader,
  LoadingAlert,
  PrimaryTitle,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import {
  BuildStatusChip,
  BuildStatusChipBuildFragment,
  BuildStatusChipRepositoryFragment,
} from "../../containers/BuildStatusChip";
import { GettingStarted } from "./GettingStarted";
import { getPossessiveForm } from "../../modules/utils";
import { hasWritePermission } from "../../modules/permissions";

const REPOSITORY_BUILDS_QUERY = gql`
  query REPOSITORY_BUILDS_QUERY(
    $ownerLogin: String!
    $name: String!
    $after: Int!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $name) {
      id
      permissions
      ...BuildStatusChipRepositoryFragment

      builds(first: 10, after: $after) {
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
          name
          ...BuildStatusChipBuildFragment

          compareScreenshotBucket {
            id
            commit
            branch
          }
        }
      }
    }
  }

  ${BuildStatusChipBuildFragment}
  ${BuildStatusChipRepositoryFragment}
`;

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

  if (loading)
    return (
      <Container>
        <LoadingAlert>
          Argos fetch <x.span fontWeight="bold">{repository.name}</x.span>{" "}
          builds. It should not take long.
        </LoadingAlert>
      </Container>
    );

  const {
    repository: {
      builds: { pageInfo, edges: builds },
    },
  } = data;

  if (pageInfo.totalCount === 0) {
    if (hasWritePermission(data.repository)) {
      return (
        <Container>
          <GettingStarted repository={repository} />
        </Container>
      );
    }
    return (
      <Container>
        <p>No build found</p>
      </Container>
    );
  }

  return (
    <Container overflowX="auto">
      <Table>
        <Thead>
          <Tr>
            <Th>Build</Th>
            <Th>Status</Th>
            <Th>Branch / Commit</Th>
            <Th w={{ md: 230 }}>Date</Th>
          </Tr>
        </Thead>
        <Tbody>
          {builds.map((build) => {
            return (
              <Tr
                key={build.id}
                backgroundColor={{ hover: "bg-hover" }}
                as={BaseLink}
                to={`${build.number}`}
              >
                <Td maxW={200}>
                  #{build.number}
                  {build.name !== "default" && (
                    <IllustratedText
                      icon={BookmarkIcon}
                      color="secondary-text"
                      as="div"
                      whiteSpace="nowrap"
                      ml="-3px"
                      textOverflow="ellipsis"
                      overflow="hidden"
                    >
                      {build.name}
                    </IllustratedText>
                  )}
                </Td>

                <Td verticalAlign="top">
                  <BuildStatusChip
                    build={build}
                    referenceBranch={data.repository.referenceBranch}
                  />
                </Td>

                <Td maxW={300}>
                  <x.div display="flex" flexDirection="column">
                    <IllustratedText
                      icon={GitBranchIcon}
                      as="div"
                      textOverflow="ellipsis"
                      overflow="hidden"
                      whiteSpace="nowrap"
                    >
                      {build.compareScreenshotBucket.branch}
                    </IllustratedText>
                    <IllustratedText icon={CommitIcon} color="secondary-text">
                      {build.compareScreenshotBucket.commit.slice(0, 7)}
                    </IllustratedText>
                  </x.div>
                </Td>

                <Td>
                  <x.div whiteSpace="nowrap" data-visual-test="transparent">
                    {moment(build.createdAt).fromNow()}
                  </x.div>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>

      {pageInfo.hasNextPage && (
        <Button mt={3} mx="auto" onClick={loadNextPage} disabled={moreLoading}>
          Load More {moreLoading && <Loader maxH={4} />}
        </Button>
      )}
    </Container>
  );
}

export function RepositoryBuilds({ repository }) {
  return (
    <>
      <Container>
        <PrimaryTitle>{getPossessiveForm(repository.name)} Builds</PrimaryTitle>
      </Container>
      <BuildsList repository={repository} />
    </>
  );
}
