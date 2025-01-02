import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { useSingleSearchParamState } from "@/util/search-params";

function getBuildNameLabel(buildName: string) {
  if (buildName === "") {
    return "All Builds";
  }
  return buildName;
}

export function useBuildNameFilterState() {
  return useSingleSearchParamState("name");
}

export function BuildNameFilter(props: {
  buildNames: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const value = props.value ?? "";
  return (
    <Select
      aria-label="Build name"
      selectedKey={value}
      onSelectionChange={(value) =>
        props.onChange(value ? String(value) : null)
      }
    >
      <SelectButton className="min-w-[8em] text-sm">
        {getBuildNameLabel(value)}
      </SelectButton>
      <Popover>
        <ListBox>
          <ListBoxItem id="" textValue="All Builds">
            All Builds
          </ListBoxItem>
          {props.buildNames.map((name) => (
            <ListBoxItem
              key={name}
              id={name}
              textValue={getBuildNameLabel(name)}
            >
              {getBuildNameLabel(name)}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
