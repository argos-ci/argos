import type { RefAttributes } from "react";
import { SelectValue, type SelectProps } from "react-aria-components";

import {
  ListBox,
  ListBoxItem,
  ListBoxItemDescription,
  ListBoxItemLabel,
} from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton, type SelectButtonProps } from "@/ui/Select";

export function MemberLevelSelect(
  props: {
    hasFineGrainedAccessControl: boolean;
    className?: string;
  } & SelectProps &
    Pick<SelectButtonProps, "size"> &
    RefAttributes<HTMLDivElement>,
) {
  const { hasFineGrainedAccessControl, size, className, ...rest } = props;

  return (
    <Select aria-label="User role" className={className} {...rest}>
      <SelectButton size={size}>
        <SelectValue>
          {({ selectedText, defaultChildren }) => {
            return selectedText ?? defaultChildren;
          }}
        </SelectValue>
      </SelectButton>
      <Popover>
        <ListBox>
          {hasFineGrainedAccessControl && (
            <ListBoxItem id="contributor" textValue="Contributor">
              <ListBoxItemLabel>Contributor</ListBoxItemLabel>
              <ListBoxItemDescription>
                Access control at the project level
              </ListBoxItemDescription>
            </ListBoxItem>
          )}
          <ListBoxItem id="member" textValue="Member">
            <ListBoxItemLabel>Member</ListBoxItemLabel>
            <ListBoxItemDescription>
              See and review builds
            </ListBoxItemDescription>
          </ListBoxItem>
          <ListBoxItem id="owner" textValue="Owner">
            <ListBoxItemLabel>Owner</ListBoxItemLabel>
            <ListBoxItemDescription>
              Admin level access to the entire team
            </ListBoxItemDescription>
          </ListBoxItem>
        </ListBox>
      </Popover>
    </Select>
  );
}
