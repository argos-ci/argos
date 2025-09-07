import {
  ArrowDownAZIcon,
  ArrowDownZAIcon,
  CalendarArrowDownIcon,
} from "lucide-react";
import { SelectValue } from "react-aria-components";
import { z } from "zod";

import { TeamMembersOrderBy } from "@/gql/graphql";
import { ListBox, ListBoxItem, ListBoxItemIcon } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

const OrderBySchema = z.enum(TeamMembersOrderBy);
type OrderBy = z.infer<typeof OrderBySchema>;

export function SortFilter(props: {
  value: OrderBy | null;
  onChange: (value: OrderBy) => void;
}) {
  const { value, onChange } = props;
  return (
    <Select
      aria-label="Sort by"
      selectedKey={value}
      onSelectionChange={(value) => onChange(OrderBySchema.parse(value))}
    >
      <SelectButton>
        <SelectValue />
      </SelectButton>
      <Popover>
        <ListBox>
          <ListBoxItem id={TeamMembersOrderBy.Date}>
            <ListBoxItemIcon>
              <CalendarArrowDownIcon />
            </ListBoxItemIcon>
            Date
          </ListBoxItem>
          <ListBoxItem id={TeamMembersOrderBy.NameAsc}>
            <ListBoxItemIcon>
              <ArrowDownAZIcon />
            </ListBoxItemIcon>
            Name (A-Z)
          </ListBoxItem>
          <ListBoxItem id={TeamMembersOrderBy.NameDesc}>
            <ListBoxItemIcon>
              <ArrowDownZAIcon />
            </ListBoxItemIcon>
            Name (Z-A)
          </ListBoxItem>
        </ListBox>
      </Popover>
    </Select>
  );
}
