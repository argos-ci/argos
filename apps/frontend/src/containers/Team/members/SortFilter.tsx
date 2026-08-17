import {
  ArrowDownAZIcon,
  ArrowDownZAIcon,
  CalendarArrowDownIcon,
} from "lucide-react";
import { z } from "zod";

import { TeamMembersOrderBy } from "@/gql/graphql";
import { ListBox, ListBoxItem, ListBoxItemIcon } from "@/ui/ListBox";
import { Select, SelectButton, SelectValue } from "@/ui/Select";

const OrderBySchema = z.enum(TeamMembersOrderBy);

/** What each order is called, so the trigger can name the chosen one. */
const OrderByLabels: Record<OrderBy, string> = {
  [TeamMembersOrderBy.Date]: "Date",
  [TeamMembersOrderBy.NameAsc]: "Name (A-Z)",
  [TeamMembersOrderBy.NameDesc]: "Name (Z-A)",
};
type OrderBy = z.infer<typeof OrderBySchema>;

export function SortFilter(props: {
  value: OrderBy | null;
  onChange: (value: OrderBy) => void;
}) {
  const { value, onChange } = props;
  return (
    <Select
      aria-label="Sort by"
      items={OrderByLabels}
      value={value}
      onValueChange={(value) => onChange(OrderBySchema.parse(value))}
    >
      <SelectButton>
        <SelectValue />
      </SelectButton>
      <ListBox>
        <ListBoxItem value={TeamMembersOrderBy.Date}>
          <ListBoxItemIcon>
            <CalendarArrowDownIcon />
          </ListBoxItemIcon>
          Date
        </ListBoxItem>
        <ListBoxItem value={TeamMembersOrderBy.NameAsc}>
          <ListBoxItemIcon>
            <ArrowDownAZIcon />
          </ListBoxItemIcon>
          Name (A-Z)
        </ListBoxItem>
        <ListBoxItem value={TeamMembersOrderBy.NameDesc}>
          <ListBoxItemIcon>
            <ArrowDownZAIcon />
          </ListBoxItemIcon>
          Name (Z-A)
        </ListBoxItem>
      </ListBox>
    </Select>
  );
}
