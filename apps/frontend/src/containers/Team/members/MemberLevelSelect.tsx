import {
  ListBox,
  ListBoxItem,
  ListBoxItemDescription,
  ListBoxItemLabel,
} from "@/ui/ListBox";
import {
  Select,
  SelectButton,
  SelectValue,
  type SelectButtonProps,
} from "@/ui/Select";

/** What each role is called, so the trigger can name the chosen one. */
const MemberLevelLabels = {
  contributor: "Contributor",
  member: "Member",
  owner: "Owner",
};

export function MemberLevelSelect(
  props: {
    hasFineGrainedAccessControl: boolean;
    className?: string;
  } & Omit<React.ComponentProps<typeof Select<string>>, "children" | "items"> &
    Pick<SelectButtonProps, "size">,
) {
  const { hasFineGrainedAccessControl, size, className, ...rest } = props;

  return (
    <Select
      aria-label="User role"
      items={MemberLevelLabels}
      className={className}
      {...rest}
    >
      <SelectButton size={size}>
        <SelectValue />
      </SelectButton>
      <ListBox>
        {hasFineGrainedAccessControl && (
          <ListBoxItem value="contributor">
            <ListBoxItemLabel>Contributor</ListBoxItemLabel>
            <ListBoxItemDescription>
              Access control at the project level
            </ListBoxItemDescription>
          </ListBoxItem>
        )}
        <ListBoxItem value="member">
          <ListBoxItemLabel>Member</ListBoxItemLabel>
          <ListBoxItemDescription>See and review builds</ListBoxItemDescription>
        </ListBoxItem>
        <ListBoxItem value="owner">
          <ListBoxItemLabel>Owner</ListBoxItemLabel>
          <ListBoxItemDescription>
            Admin level access to the entire team
          </ListBoxItemDescription>
        </ListBoxItem>
      </ListBox>
    </Select>
  );
}
