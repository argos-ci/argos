import { SelectValue } from "react-aria-components";
import z from "zod";

import { TeamUserLevel } from "@/gql/graphql";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

const MemberFilterUserLevelSchema = z.enum([
  "all",
  TeamUserLevel.Contributor,
  TeamUserLevel.Member,
  TeamUserLevel.Owner,
]);

export type MemberFilterUserLevel = z.infer<typeof MemberFilterUserLevelSchema>;

export function MemberLevelFilter(props: {
  hasFineGrainedAccessControl: boolean;
  value: MemberFilterUserLevel | null;
  onChange: (value: MemberFilterUserLevel | null) => void;
}) {
  const { hasFineGrainedAccessControl, value, onChange } = props;

  return (
    <Select
      aria-label="User role"
      selectedKey={value}
      onSelectionChange={(value) =>
        onChange(MemberFilterUserLevelSchema.parse(value))
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
