import * as React from "react";
import { useSearchParams } from "react-router-dom";

import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  useSelectState,
} from "@/ui/Select";
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
  const select = useSelectState({
    gutter: 4,
    value: props.value ?? "",
    setValue: (value: string) => {
      props.onChange(value || null);
    },
  });

  return (
    <div className="flex gap-3 items-center mb-4">
      <Select state={select} className="min-w-[8em] justify-between">
        {getBuildNameLabel(select.value)}
        <SelectArrow />
      </Select>
      <SelectPopover aria-label="Build name" state={select} portal>
        <SelectItem state={select} value="">
          All Builds
        </SelectItem>
        {props.buildNames.map((name) => (
          <SelectItem key={name} state={select} value={name}>
            {getBuildNameLabel(name)}
          </SelectItem>
        ))}
      </SelectPopover>
    </div>
  );
}
