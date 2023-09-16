import { MarkGithubIcon } from "@primer/octicons-react";

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
import { ListIcon, PlusIcon } from "lucide-react";

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

export const GithubInstallationsSelect = (props: {
  installations: FragmentType<typeof InstallationFragment>[];
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
  onSwitch: () => void;
}) => {
  const installations = useFragment(InstallationFragment, props.installations);
  const select = useSelectState({
    gutter: 4,
    value: props.value,
    setValue: props.setValue,
  });
  const title = "Organizations";
  const activeInstallation = installations.find(
    (installation) => installation.id === props.value,
  );

  if (!activeInstallation) {
    throw new Error("No active installation");
  }

  return (
    <>
      <Select state={select} className="w-full" disabled={props.disabled}>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <MarkGithubIcon />
            {activeInstallation.account.name ||
              activeInstallation.account.login}
          </div>
          <SelectArrow />
        </div>
      </Select>

      <SelectPopover aria-label={title} state={select}>
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
            <PlusIcon className="w-[1em] h-[1em]" />
            Add GitHub Account
          </div>
        </SelectItem>
        <SelectItem
          state={select}
          button
          onClick={(event) => {
            event.preventDefault();
            props.onSwitch();
          }}
        >
          <div className="flex items-center gap-2">
            <ListIcon className="w-[1em] h-[1em]" />
            Switch Git Provider
          </div>
        </SelectItem>
      </SelectPopover>
    </>
  );
};
