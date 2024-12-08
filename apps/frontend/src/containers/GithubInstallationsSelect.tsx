import { invariant } from "@apollo/client/utilities/globals";
import { MarkGithubIcon } from "@primer/octicons-react";
import { ListIcon, PlusIcon } from "lucide-react";

import { FragmentType, graphql, useFragment } from "@/gql";
import {
  ListBox,
  ListBoxItem,
  ListBoxItemIcon,
  ListBoxSeparator,
} from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

import { getGitHubAppInstallURL } from "./GitHub";

const InstallationFragment = graphql(`
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
  installations: FragmentType<typeof InstallationFragment>[];
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
  onSwitchProvider?: () => void;
  app: "main" | "light";
  accountId: string;
}) {
  const installations = useFragment(InstallationFragment, props.installations);
  const activeInstallation = (() => {
    if (props.value) {
      const installation = installations.find(
        (installation) => installation.id === props.value,
      );
      invariant(installation, "Expected installation");
      return installation;
    }

    return null;
  })();

  return (
    <Select
      aria-label="Accounts"
      selectedKey={props.value}
      onSelectionChange={(key) => {
        if (key === "switch-git-provider") {
          invariant(props.onSwitchProvider, "Expected onSwitchProvider");
          props.onSwitchProvider();
          return;
        }
        props.setValue(String(key));
      }}
    >
      <SelectButton
        ref={props.ref}
        className="w-full"
        isDisabled={props.disabled}
      >
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

      <Popover>
        <ListBox>
          {installations.map((installation) => {
            return (
              <ListBoxItem
                key={installation.id}
                id={installation.id}
                textValue={
                  installation.account.name || installation.account.login
                }
              >
                <ListBoxItemIcon>
                  <MarkGithubIcon />
                </ListBoxItemIcon>
                {installation.account.name || installation.account.login}
              </ListBoxItem>
            );
          })}
          <ListBoxSeparator />
          <ListBoxItem
            href={getGitHubAppInstallURL(props.app, {
              accountId: props.accountId,
            })}
            target="_blank"
            textValue="Add GitHub Account"
          >
            <ListBoxItemIcon>
              <PlusIcon />
            </ListBoxItemIcon>
            Add GitHub Account
          </ListBoxItem>
          {props.onSwitchProvider && (
            <ListBoxItem
              id="switch-git-provider"
              textValue="Switch Git Provider"
            >
              <ListBoxItemIcon>
                <ListIcon />
              </ListBoxItemIcon>
              Switch Git Provider
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}
