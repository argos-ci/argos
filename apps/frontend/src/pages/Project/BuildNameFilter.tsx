import { useSearchParams } from "react-router-dom";

import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { useEventCallback } from "@/ui/useEventCallback";

function getBuildNameLabel(buildName: string) {
  if (buildName === "") {
    return "All Builds";
  }
  return buildName;
}

export function useBuildNameFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get("buildName") ?? null;
  const setValue = useEventCallback((name: string | null) => {
    setSearchParams((params) => {
      const newParams = new URLSearchParams(params);
      if (!name) {
        newParams.delete("buildName");
      } else {
        newParams.set("buildName", name);
      }
      return newParams;
    });
  });
  return [value, setValue] as const;
}

export function BuildNameFilter(props: {
  buildNames: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const value = props.value ?? "";
  return (
    <div className="mb-4 flex items-center gap-3">
      <Select
        aria-label="Build name"
        selectedKey={value}
        onSelectionChange={(value) =>
          props.onChange(value ? String(value) : null)
        }
      >
        <SelectButton className="min-w-[8em]">
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
    </div>
  );
}
