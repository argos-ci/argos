import { z } from "zod";

import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Select, SelectButton, SelectValue } from "@/ui/Select";

const SourceSchema = z.enum(["everyone", "sso", "invite"]);
export type Source = z.infer<typeof SourceSchema>;

/** What each source is called, so the trigger can name the chosen one. */
const SourceLabels: Record<Source, string> = {
  everyone: "Everyone",
  sso: "Synced from GitHub",
  invite: "Manually invited",
};

export function SourceFilter(props: {
  value: Source | null;
  onChange: (value: Source) => void;
}) {
  const { value, onChange } = props;
  return (
    <Select
      aria-label="Source"
      items={SourceLabels}
      value={value}
      onValueChange={(value) => onChange(SourceSchema.parse(value))}
    >
      <SelectButton>
        <SelectValue />
      </SelectButton>

      <ListBox>
        <ListBoxItem value="everyone">Everyone</ListBoxItem>
        <ListBoxItem value="sso">Synced from GitHub</ListBoxItem>
        <ListBoxItem value="invite">Manually invited</ListBoxItem>
      </ListBox>
    </Select>
  );
}
