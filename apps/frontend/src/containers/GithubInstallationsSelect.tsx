import { invariant } from "@argos/util/invariant";
import { MarkGithubIcon } from "@primer/octicons-react";
import { ListIcon, PlusIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import {
  ListBox,
  ListBoxItem,
  ListBoxItemIcon,
  ListBoxSeparator,
} from "@/ui/ListBox";
import { Select, SelectButton } from "@/ui/Select";

import { getGitHubAppInstallURL } from "./GitHub";

const _InstallationFragment = graphql(`
  fragment GithubInstallationsSelect_GhApiInstallation on GhApiInstallation {
    id
    account {
      id
      login
      name
    }
  }
`);

export function GithubInstallationsSelect(props: {
  ref?: React.Ref<HTMLButtonElement>;
  installations: DocumentType<typeof _InstallationFragment>[];
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
  onSwitchProvider?: () => void;
  app: "main" | "light";
  accountId: string;
}) {
  const { disabled, installations, value, ref } = props;
  const activeInstallation = (() => {
    if (value) {
      const installation = installations.find(
        (installation) => installation.id === value,
      );
      invariant(installation, "Expected installation");
      return installation;
    }

    return null;
  })();

  return (
    <Select
      aria-label="Accounts"
      value={value}
      onValueChange={(key) => {
        if (key === "switch-git-provider") {
          invariant(props.onSwitchProvider, "Expected onSwitchProvider");
          props.onSwitchProvider();
          return;
        }
        // A select's rows carry values, not links, so the row that adds an
        // account opens its URL here rather than being an anchor.
        if (key === "add-github-account") {
          window.open(
            getGitHubAppInstallURL(props.app, { accountId: props.accountId }),
            "_blank",
            "noopener",
          );
          return;
        }
        props.setValue(String(key));
      }}
      disabled={disabled}
    >
      <SelectButton ref={ref} className="w-full">
        {activeInstallation ? (
          <div className="flex items-center gap-2">
            <MarkGithubIcon />
            {activeInstallation.account.name ||
              activeInstallation.account.login}
          </div>
        ) : (
          "Select a GitHub account"
        )}
      </SelectButton>

      <ListBox>
        {installations.map((installation) => {
          return (
            <ListBoxItem key={installation.id} value={installation.id}>
              <ListBoxItemIcon>
                <MarkGithubIcon />
              </ListBoxItemIcon>
              {installation.account.name || installation.account.login}
            </ListBoxItem>
          );
        })}
        <ListBoxSeparator />
        <ListBoxItem value="add-github-account">
          <ListBoxItemIcon>
            <PlusIcon />
          </ListBoxItemIcon>
          Add GitHub Account
        </ListBoxItem>
        {props.onSwitchProvider && (
          <ListBoxItem value="switch-git-provider">
            <ListBoxItemIcon>
              <ListIcon />
            </ListBoxItemIcon>
            Switch Git Provider
          </ListBoxItem>
        )}
      </ListBox>
    </Select>
  );
}
