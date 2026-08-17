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

/**
 * How each order reads on the trigger — icon included, the way react-aria's
 * value did by rendering the chosen row's own markup.
 */
const OrderByLabels: Record<OrderBy, React.ReactNode> = {
  [TeamMembersOrderBy.Date]: (
    <>
      <CalendarArrowDownIcon className="size-4 shrink-0" />
      Date
    </>
  ),
  [TeamMembersOrderBy.NameAsc]: (
    <>
      <ArrowDownAZIcon className="size-4 shrink-0" />
      Name (A-Z)
    </>
  ),
  [TeamMembersOrderBy.NameDesc]: (
    <>
      <ArrowDownZAIcon className="size-4 shrink-0" />
      Name (Z-A)
    </>
  ),
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
