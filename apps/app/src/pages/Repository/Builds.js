import React from "react";
import { x } from "@xstyled/styled-components";
import { useInView } from "react-cool-inview";
import { GitBranchIcon, CommitIcon, ClockIcon } from "@primer/octicons-react";
import moment from "moment";
import { gql } from "graphql-tag";
import { getPossessiveForm, getVariantColor } from "../../modules/utils";
import {
  Button,
  Container,
  IllustratedText,
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
    return <GettingStarted repository={repository} />;
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
          {builds.map((build, buildIndex) => {
            const statusColor = getVariantColor(build.status);

            return (
              <tr
                key={build.id}
                ref={buildIndex === builds.length - 1 ? observe : null}
              >
                <Td>
                  <TdLink
                    borderRadius="0 md md 0"
                    borderLeft={1}
                    borderLeftColor={{ _: statusColor, hover: statusColor }}
                    px={4}
                    to={`${build.number}`}
                  >
                    <IllustratedText icon={GitBranchIcon}>
                      {build.compareScreenshotBucket.branch}
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
                    color={{ _: "secondary-text", hover: "white" }}
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

export function RepositoryBuilds({ repository }) {
  return (
    <Container>
      <PrimaryTitle>{getPossessiveForm(repository.name)} builds</PrimaryTitle>
      <BuildsList repository={repository} />
    </Container>
  );
}
