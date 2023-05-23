import { graphql } from "@/gql";
import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  useSelectState,
} from "@/ui/Select";

import { AccountItem, AccountItemProps } from "./AccountItem";

export const AccountSelectorQuery = graphql(`
  query AccountSelector_me {
    me {
      id
      slug
      hasSubscribedToTrial
      ...AccountItem_Account
      teams {
        id
        slug
        hasPaidPlan
        ...AccountItem_Account
      }
    }
  }
`);

export type AccountSelectorProps = {
  value: string;
  setValue: (value: string) => void;
  accounts: AccountItemProps["account"][];
  disabledAccountIds?: string[];
};

export const AccountSelector = (props: AccountSelectorProps) => {
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
      <Select state={select} className="w-full bg-slate-700/40">
        {activeAccount ? (
          <div className="flex w-full items-center justify-between">
            <AccountItem account={activeAccount} showPlan={true} />
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
              disabled={
                props.disabledAccountIds &&
                props.disabledAccountIds.includes(account.id)
              }
            >
              <AccountItem account={account} showPlan={true} />
            </SelectItem>
          );
        })}
      </SelectPopover>
    </>
  );
};
