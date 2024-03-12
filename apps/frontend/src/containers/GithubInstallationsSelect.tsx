import * as React from "react";
import { invariant } from "@apollo/client/utilities/globals";
import { MarkGithubIcon } from "@primer/octicons-react";
import { ListIcon, PlusIcon } from "lucide-react";

import config from "@/config";
import { FragmentType, graphql, useFragment } from "@/gql";
import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  SelectSeparator,
  useSelectState,
} from "@/ui/Select";

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

export const GithubInstallationsSelect = React.forwardRef<
  HTMLButtonElement,
  {
    installations: FragmentType<typeof InstallationFragment>[];
    value: string;
    setValue: (value: string) => void;
    disabled?: boolean;
    onSwitchProvider?: () => void;
  }
>(function GithubInstallationsSelect(props, ref) {
  const installations = useFragment(InstallationFragment, props.installations);
  const select = useSelectState({
    gutter: 4,
    value: props.value,
    setValue: props.setValue,
  });
  const title = "Organizations";
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
    <>
      <Select
        ref={ref}
        state={select}
        className="w-full"
        disabled={props.disabled}
      >
        {activeInstallation ? (
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <MarkGithubIcon />
              {activeInstallation.account.name ||
                activeInstallation.account.login}
            </div>
            <SelectArrow />
          </div>
        ) : (
          "Select a GitHub account"
        )}
      </Select>

      <SelectPopover aria-label={title} state={select} portal>
        {installations.map((installation) => {
          return (
            <SelectItem
              state={select}
              key={installation.id}
              value={installation.id}
            >
              <div className="flex items-center gap-2">
                <MarkGithubIcon />
                {installation.account.name || installation.account.login}
              </div>
            </SelectItem>
          );
        })}
        <SelectSeparator />
        <SelectItem
          state={select}
          button
          onClick={(event) => {
            event.preventDefault();
            window.open(
              `${config.get(
                "github.appUrl",
              )}/installations/new?state=${encodeURIComponent(
                window.location.pathname,
              )}`,
              "_blank",
              "noopener noreferrer",
            );
          }}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <PlusIcon className="size-[1em]" />
            Add GitHub Account
          </div>
        </SelectItem>
        {props.onSwitchProvider && (
          <SelectItem
            state={select}
            button
            onClick={(event) => {
              event.preventDefault();
              props.onSwitchProvider!();
            }}
          >
            <div className="flex items-center gap-2">
              <ListIcon className="size-[1em]" />
              Switch Git Provider
            </div>
          </SelectItem>
        )}
      </SelectPopover>
    </>
  );
});
