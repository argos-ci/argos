import { MarkGithubIcon } from "@primer/octicons-react";

import config from "@/config";
import { FragmentType, graphql, useFragment } from "@/gql";
import { Anchor } from "@/ui/Link";
import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  SelectText,
  useSelectState,
} from "@/ui/Select";

const InstallationFragment = graphql(`
  fragment InstallationsSelect_GhApiInstallation on GhApiInstallation {
    id
    account {
      id
      login
      name
    }
  }
`);

export const InstallationsSelect = (props: {
  installations: FragmentType<typeof InstallationFragment>[];
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
}) => {
  const installations = useFragment(InstallationFragment, props.installations);
  const select = useSelectState({
    gutter: 4,
    value: props.value,
    setValue: props.setValue,
  });
  const title = "Organizations";
  const activeInstallation = installations.find(
    (installation) => installation.id === props.value
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
        <SelectText>
          Don&apos;t see your org?
          <br />
          <Anchor href={config.get("github.appUrl")} external>
            Manage access restrictions
          </Anchor>
        </SelectText>
      </SelectPopover>
    </>
  );
};
