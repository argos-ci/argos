import * as React from "react";
import { x } from "@xstyled/styled-components";
import {
  GitBranchIcon,
  CommitIcon,
  ClockIcon,
  BookmarkIcon,
} from "@primer/octicons-react";
import moment from "moment";
import { gql } from "graphql-tag";
import { getStatusPrimaryColor } from "../../containers/Status";
import {
  Button,
  Container,
  IllustratedText,
  Loader,
  LoadingAlert,
  PrimaryTitle,
  Table,
  Tbody,
  Td,
  TdLink,
  Th,
  Thead,
  Tr,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import { GettingStarted } from "./GettingStarted";
import { getPossessiveForm } from "../../modules/utils";
import { useUser } from "../../containers/User";

const REPOSITORY_BUILDS_QUERY = gql`
  query RepositoryBuilds($ownerLogin: String!, $name: String!, $after: Int!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $name) {
      id
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
          compareScreenshotBucket {
            id
            commit
            branch
          }
        }
      }
    }
  }
`;

function BuildsList({ repository }) {
  const user = useUser();
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

  if (pageInfo.totalCount === 0) {
    if (user) {
      return <GettingStarted repository={repository} />;
    }
    return <p>No build found</p>;
  }

  return (
    <>
      <Table>
        <Thead>
          <Tr>
            <Th>
              <x.div ml={18}>Branch</x.div>
            </Th>
            <Th width={140}>Build</Th>
            <Th width={130}>Commit</Th>
            <Th width={150}>Date</Th>
          </Tr>
        </Thead>
        <Tbody>
          {builds.map((build) => {
            const statusColor = getStatusPrimaryColor(build.status);

            return (
              <tr key={build.id}>
                <Td>
                  <TdLink
                    borderRadius="0 md md 0"
                    borderLeft={1}
                    borderLeftColor={{ _: statusColor, hover: statusColor }}
                    px={4}
                    to={`${build.number}`}
                  >
                    <IllustratedText icon={GitBranchIcon}>
                      {build.compareScreenshotBucket.branch}{" "}
                      {build.name !== "default" && (
                        <IllustratedText
                          ml={1}
                          icon={BookmarkIcon}
                          color="secondary-text"
                          field
                        >
                          {build.name}
                        </IllustratedText>
                      )}
                    </IllustratedText>
                  </TdLink>
                </Td>
                <Td>
                  <TdLink to={`${build.number}`} color={statusColor}>
                    #{build.number} {build.status}
                  </TdLink>
                </Td>
                <Td>
                  <TdLink
                    color={{ _: "secondary-text", hover: "primary-text" }}
                    target="_blank"
                    href={`https://github.com/${repository.owner.login}/${repository.name}/commit/${build.compareScreenshotBucket.commit}`}
                  >
                    <IllustratedText icon={CommitIcon}>
                      {build.compareScreenshotBucket.commit.slice(0, 7)}
                    </IllustratedText>
                  </TdLink>
                </Td>

                <Td color="secondary-text" px={4}>
                  <IllustratedText icon={ClockIcon}>
                    {moment(build.createdAt).fromNow()}
                  </IllustratedText>
                </Td>
              </tr>
            );
          })}
        </Tbody>
      </Table>

      {pageInfo.hasNextPage && (
        <Button mt={3} mx="auto" onClick={loadNextPage} disabled={moreLoading}>
          Load More {moreLoading && <Loader />}
        </Button>
      )}
    </>
  );
}

export function RepositoryBuilds({ repository }) {
  return (
    <Container>
      <PrimaryTitle>{getPossessiveForm(repository.name)} Builds</PrimaryTitle>
      <BuildsList repository={repository} />
    </Container>
  );
}
