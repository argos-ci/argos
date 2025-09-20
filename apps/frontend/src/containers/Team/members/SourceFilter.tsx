import { SelectValue } from "react-aria-components";
import { z } from "zod";

import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

const SourceSchema = z.enum(["everyone", "sso", "invite"]);
export type Source = z.infer<typeof SourceSchema>;

export function SourceFilter(props: {
  value: Source | null;
  onChange: (value: Source) => void;
}) {
  const { value, onChange } = props;
  return (
    <Select
      aria-label="Source"
      selectedKey={value}
      onSelectionChange={(value) => onChange(SourceSchema.parse(value))}
    >
      <SelectButton>
        <SelectValue />
      </SelectButton>

      <Popover>
        <ListBox>
          <ListBoxItem id="everyone">Everyone</ListBoxItem>
          <ListBoxItem id="sso">Synced from GitHub</ListBoxItem>
          <ListBoxItem id="invite">Manually invited</ListBoxItem>
        </ListBox>
      </Popover>
    </Select>
  );
}
