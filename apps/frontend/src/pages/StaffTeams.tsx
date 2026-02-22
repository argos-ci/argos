import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { SearchIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";

import { AuthGuard } from "@/containers/AuthGuard";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { PageLoader } from "@/ui/PageLoader";
import { TablePagination } from "@/ui/TablePagination";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";

import { StaffTeamsTable } from "./StaffTeams/StaffTeamsTable";
import {
  PAGE_SIZE,
  StaffTeamsQuery,
  type SortDirection,
  type SortKey,
  checkTeamMatchesSearch,
} from "./StaffTeams/shared";

function StaffTeamsSearchField(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextInputGroup className="w-72">
      <TextInputIcon>
        <SearchIcon />
      </TextInputIcon>
      <TextInput
        type="search"
        placeholder="Search teams or members…"
        scale="sm"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </TextInputGroup>
  );
}

function StaffTeamsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, error } = useQuery(StaffTeamsQuery);
  const [openedTeams, setOpenedTeams] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const deferredSearch = useDeferredValue(search);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const searchParamValue = searchParams.get("search") ?? "";

  useEffect(() => {
    if (search !== searchParamValue) {
      setPage(1);
      setSearch(searchParamValue);
    }
  }, [search, searchParamValue]);

  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setPage(1);
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setPage(1);
    setSortKey(key);
    setSortDirection(key === "team" || key === "createdAt" ? "asc" : "desc");
  };

  const filteredAndSortedTeams = useMemo(() => {
    const teams = (data?.staffTeams ?? []).filter((team) =>
      checkTeamMatchesSearch(team, normalizedSearch),
    );

    const directionFactor = sortDirection === "asc" ? 1 : -1;

    return teams.toSorted((a, b) => {
      switch (sortKey) {
        case "team": {
          const left = (a.name || a.slug).toLowerCase();
          const right = (b.name || b.slug).toLowerCase();
          return left.localeCompare(right) * directionFactor;
        }
        case "createdAt":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            directionFactor
          );
        case "members":
          return (a.membersCount - b.membersCount) * directionFactor;
      }
    });
  }, [data?.staffTeams, normalizedSearch, sortDirection, sortKey]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedTeams.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);

  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedTeams.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredAndSortedTeams]);

  const displayFrom =
    filteredAndSortedTeams.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const displayTo = Math.min(
    currentPage * PAGE_SIZE,
    filteredAndSortedTeams.length,
  );

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    const isForbidden =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some((error) => error.extensions?.code === "FORBIDDEN");

    if (isForbidden) {
      return (
        <Alert>
          <AlertTitle>Access restricted</AlertTitle>
          <AlertText>This page is only available to staff users.</AlertText>
          <AlertText>
            <Link href="/teams">Go to your teams</Link>
          </AlertText>
        </Alert>
      );
    }

    throw error;
  }

  if (!data) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>All Teams</Heading>
          <Text slot="headline">
            Team directory for staff with members, subscriptions, and usage.
          </Text>
        </PageHeaderContent>
        <PageHeaderActions className="items-center">
          <StaffTeamsSearchField
            value={search}
            onChange={(value) => {
              setPage(1);
              setSearch(value);
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (value.trim()) {
                  next.set("search", value);
                } else {
                  next.delete("search");
                }
                return next;
              });
            }}
          />
        </PageHeaderActions>
      </PageHeader>

      <StaffTeamsTable
        teams={paginatedTeams}
        openedTeams={openedTeams}
        setOpenedTeams={setOpenedTeams}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
      />

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        displayFrom={displayFrom}
        displayTo={displayTo}
        totalCount={filteredAndSortedTeams.length}
        itemLabel="teams"
        onPrevious={() => setPage((value) => Math.max(1, value - 1))}
        onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
      />
    </PageContainer>
  );
}

export function Component() {
  return (
    <Page>
      <Helmet>
        <title>All Teams</title>
      </Helmet>
      <AuthGuard>{() => <StaffTeamsList />}</AuthGuard>
    </Page>
  );
}
