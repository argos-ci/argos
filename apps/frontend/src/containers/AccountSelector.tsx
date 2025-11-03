import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

import { AccountItem, AccountItemProps } from "./AccountItem";

export function AccountSelector(props: {
  value: string;
  setValue: (value: string) => void;
  accounts: AccountItemProps["account"][] | null;
  disabledAccountIds?: string[];
  disabledTooltip?: string;
}) {
  if (!props.accounts) {
    return <SelectButton isDisabled>Loading…</SelectButton>;
  }

  const activeAccount =
    props.accounts.find((account: any) => {
      return account.id === props.value;
    }) ?? null;

  return (
    <Select
      aria-label="Accounts"
      value={props.value}
      onChange={(value) => props.setValue(String(value))}
    >
      <SelectButton className="w-full">
        {activeAccount ? (
          <AccountItem account={activeAccount} showPlan />
        ) : (
          "Select an account"
        )}
      </SelectButton>

      <Popover>
        <ListBox>
          {props.accounts.map((account: any) => {
            return (
              <ListBoxItem
                key={account.id}
                id={account.id}
                isDisabled={Boolean(
                  props.disabledAccountIds?.includes(account.id),
                )}
                textValue={account.name || account.slug}
              >
                <AccountItem account={account} showPlan />
              </ListBoxItem>
            );
          })}
        </ListBox>
      </Popover>
    </Select>
  );
}
