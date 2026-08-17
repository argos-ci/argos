import z from "zod";

import { TeamUserLevel } from "@/gql/graphql";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Select, SelectButton, SelectValue } from "@/ui/Select";

const FilterUserLevelSchema = z.enum([
  "all",
  TeamUserLevel.Contributor,
  TeamUserLevel.Member,
  TeamUserLevel.Owner,
]);

export type FilterUserLevel = z.infer<typeof FilterUserLevelSchema>;

/** What each role is called, so the trigger can name the chosen one. */
const FilterUserLevelLabels: Record<FilterUserLevel, string> = {
  all: "All roles",
  [TeamUserLevel.Contributor]: "Contributor",
  [TeamUserLevel.Member]: "Member",
  [TeamUserLevel.Owner]: "Owner",
};

export function MemberLevelFilter(props: {
  hasFineGrainedAccessControl: boolean;
  value: FilterUserLevel;
  onChange: (value: FilterUserLevel) => void;
}) {
  const { hasFineGrainedAccessControl, value, onChange } = props;

  return (
    <Select
      aria-label="User role"
      items={FilterUserLevelLabels}
      value={value}
      onValueChange={(value) => onChange(FilterUserLevelSchema.parse(value))}
    >
      <SelectButton>
        <SelectValue />
      </SelectButton>
      <ListBox>
        <ListBoxItem value="all">All roles</ListBoxItem>
        {hasFineGrainedAccessControl && (
          <ListBoxItem value="contributor">Contributor</ListBoxItem>
        )}
        <ListBoxItem value="member">Member</ListBoxItem>
        <ListBoxItem value="owner">Owner</ListBoxItem>
      </ListBox>
    </Select>
  );
}
