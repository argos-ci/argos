import { SelectValue } from "react-aria-components";
import z from "zod";

import { TeamUserLevel } from "@/gql/graphql";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

const FilterUserLevelSchema = z.enum([
  "all",
  TeamUserLevel.Contributor,
  TeamUserLevel.Member,
  TeamUserLevel.Owner,
]);

export type FilterUserLevel = z.infer<typeof FilterUserLevelSchema>;

export function MemberLevelFilter(props: {
  hasFineGrainedAccessControl: boolean;
  value: FilterUserLevel;
  onChange: (value: FilterUserLevel) => void;
}) {
  const { hasFineGrainedAccessControl, value, onChange } = props;

  return (
    <Select
      aria-label="User role"
      selectedKey={value}
      onSelectionChange={(value) =>
        onChange(FilterUserLevelSchema.parse(value))
      }
    >
      <SelectButton>
        <SelectValue />
      </SelectButton>
      <Popover>
        <ListBox>
          <ListBoxItem id="all">All roles</ListBoxItem>
          {hasFineGrainedAccessControl && (
            <ListBoxItem id="contributor">Contributor</ListBoxItem>
          )}
          <ListBoxItem id="member">Member</ListBoxItem>
          <ListBoxItem id="owner">Owner</ListBoxItem>
        </ListBox>
      </Popover>
    </Select>
  );
}
