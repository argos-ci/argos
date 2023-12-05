import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  useSelectState,
} from "@/ui/Select";

import { AccountItem, AccountItemProps } from "./AccountItem";

export const AccountSelector = (props: {
  value: string;
  setValue: (value: string) => void;
  accounts: AccountItemProps["account"][] | null;
  disabledAccountIds?: string[];
  disabledTooltip?: string;
}) => {
  const select = useSelectState({
    gutter: 4,
    value: props.value,
    setValue: props.setValue,
  });
  if (!props.accounts) {
    return (
      <Select state={select} className="w-full">
        Loading...
      </Select>
    );
  }

  const activeAccount =
    props.accounts.find((account: any) => {
      return account.id === props.value;
    }) ?? null;
  return (
    <>
      <Select state={select} className="w-full">
        {activeAccount ? (
          <div className="flex w-full items-center justify-between">
            <AccountItem account={activeAccount} showPlan />
            <SelectArrow />
          </div>
        ) : (
          <div className="flex w-full items-center justify-between">
            Select an account
            <SelectArrow />
          </div>
        )}
      </Select>

      <SelectPopover state={select} aria-label="Accounts" portal>
        {props.accounts.map((account: any) => {
          return (
            <SelectItem
              state={select}
              key={account.id}
              value={account.id}
              disabled={Boolean(props.disabledAccountIds?.includes(account.id))}
            >
              <AccountItem account={account} showPlan />
            </SelectItem>
          );
        })}
      </SelectPopover>
    </>
  );
};
