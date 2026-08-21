import { useState } from "react";
import { useApolloClient } from "@apollo/client/react";

import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Link } from "@/ui/Link";
import { List, ListEmpty, ListRow } from "@/ui/List";
import { TextInput } from "@/ui/TextInput";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

const _InstallationFragment = graphql(`
  fragment OriginRepositoryList_OriginInstallation on OriginInstallation {
    id
    targetSlug
    repositories {
      id
      name
      fullName
    }
  }
`);

const SyncOriginInstallationMutation = graphql(`
  mutation OriginRepositoryList_syncOriginInstallation($accountId: ID!) {
    syncOriginInstallation(input: { accountId: $accountId }) {
      id
      originInstallation {
        id
        ...OriginRepositoryList_OriginInstallation
      }
    }
  }
`);

export type OriginRepository = DocumentType<
  typeof _InstallationFragment
>["repositories"][number];

/**
 * The repositories reachable through the account's Origin installation, as
 * last synchronized. Reading them from Argos rather than Origin keeps the list
 * instant; the refresh button is for a repository created since.
 */
export function OriginRepositoryList(props: {
  installation: DocumentType<typeof _InstallationFragment>;
  accountId: string;
  onSelectRepository: (repository: OriginRepository) => void;
  connectButtonLabel: string;
  disabled?: boolean;
}) {
  const { installation } = props;
  const client = useApolloClient();
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const repositories = installation.repositories.filter((repository) =>
    repository.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const sync = async () => {
    setSyncing(true);
    try {
      await client.mutate({
        mutation: SyncOriginInstallationMutation,
        variables: { accountId: props.accountId },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <div className="flex items-end gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="origin-repo-search">
            Search
          </label>
          <TextInput
            id="origin-repo-search"
            name="search"
            placeholder="Repository name"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            sync().catch(() => {});
          }}
          disabled={syncing || props.disabled}
        >
          {syncing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      <List>
        {repositories.map((repository) => (
          <ListRow
            key={repository.id}
            className="flex items-center justify-between gap-4 p-4"
          >
            <div>{repository.fullName}</div>
            <Button
              onClick={() => props.onSelectRepository(repository)}
              disabled={props.disabled}
            >
              {props.connectButtonLabel}
            </Button>
          </ListRow>
        ))}
        {repositories.length === 0 && (
          <ListEmpty>
            {installation.repositories.length === 0
              ? "The Argos app reaches no repository yet."
              : "No repository matches your search."}
          </ListEmpty>
        )}
        <ListRow className="p-4 text-sm">
          Repository not in the list?{" "}
          <Link
            href="https://cursor.com/codebase/settings/apps"
            target="_blank"
          >
            Manage the app on Origin
          </Link>{" "}
          then refresh.
        </ListRow>
      </List>
    </>
  );
}
