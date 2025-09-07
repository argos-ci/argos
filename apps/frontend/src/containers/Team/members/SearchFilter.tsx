import { SearchIcon } from "lucide-react";

import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";

export function SearchFilter(props: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextInputGroup className="w-full">
      <TextInputIcon>
        <SearchIcon />
      </TextInputIcon>
      <TextInput
        type="search"
        placeholder="Filter…"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </TextInputGroup>
  );
}
