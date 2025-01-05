import { invariant } from "@argos/util/invariant";
import { ListIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import {
  ListBox,
  ListBoxItem,
  ListBoxItemIcon,
  ListBoxSeparator,
} from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

import { GitLabLogo } from "./GitLab";

const _NamespaceFragment = graphql(`
  fragment GitlabNamespacesSelect_GlApiNamespace on GlApiNamespace {
    id
    name
    path
  }
`);

export const GitlabNamespacesSelect = (props: {
  namespaces: DocumentType<typeof _NamespaceFragment>[];
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
  onSwitch: () => void;
}) => {
  const { namespaces } = props;
  const activeNamespace = namespaces.find(
    (namespace) => namespace.id === props.value,
  );

  invariant(props.value === "all" || activeNamespace, "no active installation");

  return (
    <Select
      aria-label="Namespaces"
      selectedKey={props.value}
      onSelectionChange={(value) => {
        if (value === "switch-git-provider") {
          props.onSwitch();
          return;
        }
        props.setValue(String(value));
      }}
    >
      <SelectButton className="w-full" isDisabled={props.disabled}>
        <div className="flex items-center gap-2">
          <GitLabLogo aria-hidden />
          {activeNamespace
            ? activeNamespace.name || activeNamespace.path
            : "All Projects..."}
        </div>
      </SelectButton>

      <Popover>
        <ListBox>
          {namespaces.map((namespace) => {
            return (
              <ListBoxItem
                key={namespace.id}
                id={namespace.id}
                textValue={namespace.name || namespace.path}
              >
                <ListBoxItemIcon>
                  <GitLabLogo />
                </ListBoxItemIcon>
                {namespace.name || namespace.path}
              </ListBoxItem>
            );
          })}
          <ListBoxItem id="all" textValue="All Projects...">
            <ListBoxItemIcon>
              <GitLabLogo />
            </ListBoxItemIcon>
            All Projects...
          </ListBoxItem>
          <ListBoxSeparator />
          <ListBoxItem id="switch-git-provider" textValue="Switch Git Provider">
            <ListBoxItemIcon>
              <ListIcon />
            </ListBoxItemIcon>
            Switch Git Provider
          </ListBoxItem>
        </ListBox>
      </Popover>
    </Select>
  );
};
