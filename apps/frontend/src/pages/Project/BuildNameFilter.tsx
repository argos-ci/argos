import { SearchIcon, XIcon } from "lucide-react";
import { parseAsString } from "nuqs";
import {
  Autocomplete,
  Button,
  SearchField,
  useFilter,
} from "react-aria-components";

import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";

function getBuildNameLabel(buildName: string) {
  if (buildName === "") {
    return "All builds";
  }
  return buildName;
}

export const BuildNameFilterParser = parseAsString;

export function BuildNameFilter(props: {
  buildNames: string[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const value = props.value ?? "";
  const { contains } = useFilter({ sensitivity: "base" });
  return (
    <Select
      aria-label="Build name"
      value={value}
      onChange={(value) => props.onChange(value ? String(value) : null)}
    >
      <SelectButton className="min-w-[8em] text-sm">
        {getBuildNameLabel(value)}
      </SelectButton>
      <Popover className="flex flex-col gap-2">
        <Autocomplete filter={contains}>
          <SearchField className="relative">
            <SearchIcon
              aria-hidden
              className="text-low pointer-events-none absolute top-2 left-2 size-4"
            />
            <TextInput
              scale="sm"
              className="!pl-8 [&::-webkit-search-cancel-button]:hidden"
              placeholder="Find build name…"
            />
            <Button className="text-low data-[hovered]:text-default absolute top-2 right-2">
              <XIcon className="size-4" />
            </Button>
          </SearchField>
          <ListBox
            renderEmptyState={() => (
              <div className="text-low px-1 pb-1 text-sm">
                No build names found
              </div>
            )}
          >
            <ListBoxItem id="" textValue="All builds">
              All builds
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
        </Autocomplete>
      </Popover>
    </Select>
  );
}
