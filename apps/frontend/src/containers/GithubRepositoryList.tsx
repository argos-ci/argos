import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { List, ListRow } from "@/ui/List";
import { Loader } from "@/ui/Loader";
import { Time } from "@/ui/Time";

import { Query } from "./Apollo";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationButtonItem,
  PaginationNext,
  PaginationPrevious,
} from "@/ui/Pagination";
import { useState } from "react";

const InstallationQuery = graphql(`
  query GithubRepositoryList_ghApiInstallationRepositories(
    $installationId: ID!
    $page: Int!
    $reposPerPage: Int
  ) {
    ghApiInstallationRepositories(
      installationId: $installationId
      page: $page
      reposPerPage: $reposPerPage
    ) {
      edges {
        id
        name
        updated_at
        owner_login
      }
      pageInfo {
        hasNextPage
        totalCount
      }
    }
  }
`);

const getPaginationIndexes = function (
  page: number,
  pageCount: number,
  maxPaginationButtonCount: number,
) {
  const firstPage = Math.max(
    2,
    Math.min(
      page - Math.floor((maxPaginationButtonCount - 2) / 2),
      pageCount - maxPaginationButtonCount + 2,
    ),
  );
  const lastPage = Math.min(
    pageCount - 1,
    Math.max(
      page + Math.floor((maxPaginationButtonCount - 2) / 2),
      firstPage + maxPaginationButtonCount - 3,
    ),
  );
  return Array.from(
    { length: lastPage - firstPage + 1 },
    (_, i) => i + firstPage,
  );
};

const ReposPagination = ({
  setPage,
  page,
  pageCount,
  paginationItemCount,
}: {
  setPage: (page: number) => void;
  page: number;
  pageCount: number;
  paginationItemCount: number;
}) => {
  const paginationIndexes = getPaginationIndexes(
    page,
    pageCount,
    paginationItemCount,
  );

  const PaginationItem = function ({ index }: { index: number }) {
    return (
      <PaginationButtonItem
        isActive={index === page}
        onClick={() => setPage(index)}
      >
        {index}
      </PaginationButtonItem>
    );
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationPrevious
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        />
        <PaginationItem index={1} />
        {page > paginationItemCount / 2 + 1 && <PaginationEllipsis />}
        {paginationIndexes.map((pageNumber) => (
          <PaginationItem key={pageNumber} index={pageNumber} />
        ))}
        {page < pageCount - paginationItemCount / 2 && <PaginationEllipsis />}
        <PaginationItem index={pageCount} />
        <PaginationNext
          onClick={() => setPage(page + 1)}
          disabled={page === pageCount}
        />
      </PaginationContent>
    </Pagination>
  );
};

export const GithubRepositoryList = (props: {
  installationId: string;
  onSelectRepository: (repo: {
    id: string;
    name: string;
    owner_login: string;
  }) => void;
  disabled?: boolean;
  connectButtonLabel: string;
}) => {
  const reposPerPage = 100;
  const [page, setPage] = useState(1);

  return (
    <Query
      fallback={<Loader />}
      query={InstallationQuery}
      variables={{ installationId: props.installationId, page, reposPerPage }}
    >
      {({ ghApiInstallationRepositories }) => {
        const pageCount = Math.ceil(
          ghApiInstallationRepositories.pageInfo.totalCount / reposPerPage,
        );

        return (
          <>
            <List className="overflow-auto">
              {ghApiInstallationRepositories.edges.map((repo) => (
                <ListRow
                  key={repo.id}
                  className="justify-between p-4 items-center"
                >
                  <div>
                    {repo.name} •{" "}
                    <Time date={repo.updated_at} className="text-low" />
                  </div>
                  <Button
                    onClick={() => {
                      props.onSelectRepository(repo);
                    }}
                    disabled={props.disabled}
                  >
                    {props.connectButtonLabel}
                  </Button>
                </ListRow>
              ))}
            </List>

            {pageCount > 1 && (
              <ReposPagination
                page={page}
                pageCount={pageCount}
                setPage={setPage}
                paginationItemCount={7}
              />
            )}
          </>
        );
      }}
    </Query>
  );
};
