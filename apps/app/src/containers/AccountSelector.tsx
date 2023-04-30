import { graphql } from "@/gql";
import {
  Select,
  SelectArrow,
  SelectItem,
  SelectPopover,
  useSelectState,
} from "@/ui/Select";

import { AccountItem } from "./AccountItem";
import { useQuery } from "./Apollo";

const MeQuery = graphql(`
  query ProjectTransfer_me {
    me {
      id
      ...AccountItem_Account
      teams {
        id
        ...AccountItem_Account
      }
    }
  }
`);

export type AccountSelectorProps = {
  actualAccountId?: string;
  value: string;
  setValue: (value: string) => void;
};

export const AccountSelector = (props: AccountSelectorProps) => {
  const { data } = useQuery(MeQuery);
  const select = useSelectState({
    gutter: 4,
    value: props.value,
    setValue: props.setValue,
  });
  if (!data) {
    return (
      <Select state={select} className="w-full">
        Loading...
      </Select>
    );
  }
  if (!data.me) {
    throw new Error("Invariant: no user");
  }
  const accounts = [data.me, ...data.me.teams];
  const activeAccount =
    accounts.find((account) => {
      return account.id === props.value;
    }) ?? null;
  return (
    <>
      <Select state={select} className="w-full">
        {activeAccount ? (
          <div className="flex w-full items-center justify-between">
            <AccountItem account={activeAccount} />
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
        {accounts.map((account) => {
          return (
            <SelectItem
              state={select}
              key={account.id}
              value={account.id}
              disabled={Boolean(
                props.actualAccountId && props.actualAccountId === account.id
              )}
            >
              <AccountItem account={account} />
            </SelectItem>
          );
        })}
      </SelectPopover>
    </>
  );
};
