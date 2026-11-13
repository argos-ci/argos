import { useCallback } from "react";
import { useSearchParams } from "react-router";
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

/**
 * The role filter, kept in the URL (`?role=owner`) so a note telling a member
 * to ask an owner can link to the list of owners.
 */
export function useFilterUserLevelParam(options: {
  hasFineGrainedAccessControl: boolean;
}): [FilterUserLevel, (value: FilterUserLevel) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = FilterUserLevelSchema.safeParse(searchParams.get("role"));
  // Without fine-grained access control the filter offers no Contributor.
  const value =
    parsed.success &&
    (parsed.data !== TeamUserLevel.Contributor ||
      options.hasFineGrainedAccessControl)
      ? parsed.data
      : "all";
  const setValue = useCallback(
    (value: FilterUserLevel) => {
      setSearchParams(
        (params) => {
          const next = new URLSearchParams(params);
          if (value === "all") {
            next.delete("role");
          } else {
            next.set("role", value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  return [value, setValue];
}

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
