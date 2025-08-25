import { useState } from "react";

import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Link } from "@/ui/Link";
import { List, ListRow } from "@/ui/List";
import { Loader } from "@/ui/Loader";
import {
  Pagination,
  PaginationButtonItem,
  PaginationContent,
  PaginationEllipsis,
  PaginationNext,
  PaginationPrevious,
} from "@/ui/Pagination";
import { Time } from "@/ui/Time";

import { useSafeQuery } from "./Apollo";
import { getGitHubAppInstallURL } from "./GitHub";

const InstallationQuery = graphql(`
  query GithubRepositoryList_ghApiInstallationRepositories(
    $installationId: ID!
    $page: Int!
    $reposPerPage: Int
    $fromAuthUser: Boolean!
  ) {
    ghApiInstallationRepositories(
      installationId: $installationId
      fromAuthUser: $fromAuthUser
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

function getPaginationIndexes(
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
}

function PaginationItem(props: {
  index: number;
  page: number;
  setPage: (page: number) => void;
}) {
  return (
    <PaginationButtonItem
      isActive={props.index === props.page}
      onPress={() => props.setPage(props.index)}
    >
      {props.index}
    </PaginationButtonItem>
  );
}

function ReposPagination({
  setPage,
  page,
  pageCount,
  paginationItemCount,
}: {
  setPage: (page: number) => void;
  page: number;
  pageCount: number;
  paginationItemCount: number;
}) {
  const paginationIndexes = getPaginationIndexes(
    page,
    pageCount,
    paginationItemCount,
  );

  return (
    <Pagination>
      <PaginationContent>
        <PaginationPrevious
          onPress={() => setPage(page - 1)}
          isDisabled={page === 1}
        />
        <PaginationItem index={1} page={page} setPage={setPage} />
        {page > paginationItemCount / 2 + 1 && <PaginationEllipsis />}
        {paginationIndexes.map((pageNumber) => (
          <PaginationItem
            key={pageNumber}
            index={pageNumber}
            page={page}
            setPage={setPage}
          />
        ))}
        {page < pageCount - paginationItemCount / 2 && <PaginationEllipsis />}
        <PaginationItem index={pageCount} page={page} setPage={setPage} />
        <PaginationNext
          onPress={() => setPage(page + 1)}
          isDisabled={page === pageCount}
        />
      </PaginationContent>
    </Pagination>
  );
}

export function GithubRepositoryList(props: {
  installationId: string;
  onSelectRepository: (repo: {
    id: string;
    name: string;
    owner_login: string;
  }) => void;
  disabled?: boolean;
  connectButtonLabel: string;
  app: "main" | "light";
  accountId: string;
}) {
  const reposPerPage = 100;
  const [page, setPage] = useState(1);

  const result = useSafeQuery(InstallationQuery, {
    variables: {
      installationId: props.installationId,
      page,
      reposPerPage,
      fromAuthUser: props.app === "main",
    },
  });

  const data = result.data || result.previousData;

  if (!data) {
    return <Loader />;
  }

  const { ghApiInstallationRepositories } = data;

  const pageCount = Math.ceil(
    ghApiInstallationRepositories.pageInfo.totalCount / reposPerPage,
  );

  return (
    <>
      <List>
        {ghApiInstallationRepositories.edges.map((repo) => (
          <ListRow
            key={repo.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div>
              {repo.name} • <Time date={repo.updated_at} className="text-low" />
            </div>
            <Button
              onPress={() => {
                props.onSelectRepository(repo);
              }}
              isDisabled={props.disabled}
            >
              {props.connectButtonLabel}
            </Button>
          </ListRow>
        ))}
        {page === pageCount && (
          <ListRow className="p-4 text-sm">
            Repository not in the list?{" "}
            <Link
              href={getGitHubAppInstallURL(props.app, {
                accountId: props.accountId,
              })}
              target="_blank"
            >
              Manage repositories
            </Link>
          </ListRow>
        )}
      </List>

      {pageCount > 1 && (
        <ReposPagination
          page={page}
          pageCount={pageCount}
          setPage={setPage}
          paginationItemCount={5}
        />
      )}
    </>
  );
}
