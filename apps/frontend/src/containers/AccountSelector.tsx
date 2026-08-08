import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

import { AccountItem, AccountItemProps } from "./AccountItem";

export function AccountSelector(props: {
  value: string;
  setValue: (value: string) => void;
  accounts: AccountItemProps["account"][] | null;
  /**
   * Accounts that cannot be picked, mapped to why. Unselectable accounts stay
   * in the list with their reason shown: dropping them would leave someone
   * looking for a team that is right there in their sidebar, wondering whether
   * Argos lost it.
   */
  disabledReasons?: Record<string, string>;
}) {
  if (!props.accounts) {
    return <SelectButton isDisabled>Loading…</SelectButton>;
  }

  const activeAccount =
    props.accounts.find((account) => {
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
          {props.accounts.map((account) => {
            const disabledReason = props.disabledReasons?.[account.id];
            return (
              <ListBoxItem
                key={account.id}
                id={account.id}
                isDisabled={Boolean(disabledReason)}
                textValue={account.name || account.slug}
              >
                <div className="flex w-full items-center justify-between gap-4">
                  <AccountItem account={account} showPlan />
                  {disabledReason ? (
                    <span className="text-low shrink-0 text-xs">
                      {disabledReason}
                    </span>
                  ) : null}
                </div>
              </ListBoxItem>
            );
          })}
        </ListBox>
      </Popover>
    </Select>
  );
}
