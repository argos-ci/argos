import { FragmentType, graphql, useFragment } from "@/gql";
import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  SelectSeparator,
  useSelectState,
} from "@/ui/Select";
import { ListBulletIcon, PlusIcon } from "@heroicons/react/24/outline";
import { GitLabLogo } from "./GitLab";

const NamespaceFragment = graphql(`
  fragment GitlabNamespacesSelect_GlApiNamespace on GlApiNamespace {
    id
    name
    path
  }
`);

export const GitlabNamespacesSelect = (props: {
  namespaces: FragmentType<typeof NamespaceFragment>[];
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
  onSwitch: () => void;
}) => {
  const namespaces = useFragment(NamespaceFragment, props.namespaces);
  const select = useSelectState({
    gutter: 4,
    value: props.value,
    setValue: props.setValue,
  });
  const title = "Namespaces";
  const activeNamespace = namespaces.find(
    (namespace) => namespace.id === props.value,
  );

  if (!activeNamespace) {
    throw new Error("No active installation");
  }

  return (
    <>
      <Select state={select} className="w-full" disabled={props.disabled}>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <GitLabLogo aria-hidden />
            {activeNamespace.name || activeNamespace.path}
          </div>
          <SelectArrow />
        </div>
      </Select>

      <SelectPopover aria-label={title} state={select}>
        {namespaces.map((namespace) => {
          return (
            <SelectItem state={select} key={namespace.id} value={namespace.id}>
              <div className="flex items-center gap-2">
                <GitLabLogo aria-hidden />
                {namespace.name || namespace.path}
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
              "https://argos-ci.com/docs/gitlab",
              "_blank",
              "noopener noreferrer",
            );
          }}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <PlusIcon className="w-[1em] h-[1em]" />
            Add GitLab Namespace
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
            <ListBulletIcon className="w-[1em] h-[1em]" />
            Switch Git Provider
          </div>
        </SelectItem>
      </SelectPopover>
    </>
  );
};
