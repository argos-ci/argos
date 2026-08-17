import { invariant } from "@argos/util/invariant";
import { ListIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import {
  ListBox,
  ListBoxItem,
  ListBoxItemIcon,
  ListBoxSeparator,
} from "@/ui/ListBox";
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
      value={props.value}
      onValueChange={(value) => {
        if (value === "switch-git-provider") {
          props.onSwitch();
          return;
        }
        props.setValue(String(value));
      }}
      disabled={props.disabled}
    >
      <SelectButton className="w-full">
        <div className="flex items-center gap-2">
          <GitLabLogo aria-hidden />
          {activeNamespace
            ? activeNamespace.name || activeNamespace.path
            : "All Projects..."}
        </div>
      </SelectButton>

      <ListBox>
        {namespaces.map((namespace) => {
          return (
            <ListBoxItem key={namespace.id} value={namespace.id}>
              <ListBoxItemIcon>
                <GitLabLogo />
              </ListBoxItemIcon>
              {namespace.name || namespace.path}
            </ListBoxItem>
          );
        })}
        <ListBoxItem value="all">
          <ListBoxItemIcon>
            <GitLabLogo />
          </ListBoxItemIcon>
          All Projects...
        </ListBoxItem>
        <ListBoxSeparator />
        <ListBoxItem value="switch-git-provider">
          <ListBoxItemIcon>
            <ListIcon />
          </ListBoxItemIcon>
          Switch Git Provider
        </ListBoxItem>
      </ListBox>
    </Select>
  );
};
