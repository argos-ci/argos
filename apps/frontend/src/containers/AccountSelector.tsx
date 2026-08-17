import { ListBox, ListBoxItem } from "@/ui/ListBox";
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
    // Still a real select, just an empty disabled one: `SelectButton` is Base
    // UI's trigger and has to have its root above it.
    return (
      <Select aria-label="Accounts" disabled>
        <SelectButton className="w-full">Loading…</SelectButton>
        <ListBox>{null}</ListBox>
      </Select>
    );
  }

  const activeAccount =
    props.accounts.find((account) => {
      return account.id === props.value;
    }) ?? null;

  return (
    <Select
      aria-label="Accounts"
      value={props.value}
      onValueChange={(value) => props.setValue(String(value))}
    >
      <SelectButton className="w-full">
        {activeAccount ? (
          <AccountItem account={activeAccount} showPlan />
        ) : (
          "Select an account"
        )}
      </SelectButton>

      <ListBox>
        {props.accounts.map((account) => {
          const disabledReason = props.disabledReasons?.[account.id];
          return (
            <ListBoxItem
              key={account.id}
              value={account.id}
              disabled={Boolean(disabledReason)}
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
    </Select>
  );
}
