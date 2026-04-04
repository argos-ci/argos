import { useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { AlertCircleIcon } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroupField } from "@/ui/CheckboxGroup";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Pre } from "@/ui/Pre";
import { SelectButton, SelectField, SelectValue } from "@/ui/Select";

const CreateUserAccessTokenMutation = graphql(`
  mutation CreateUserAccessToken($input: CreateUserAccessTokenInput!) {
    createUserAccessToken(input: $input) {
      accessToken {
        id
        name
        createdAt
        expireAt
        lastUsedAt
        source
        scope {
          id
          name
          slug
        }
      }
      token
    }
  }
`);

const UserAccessTokenCacheFragment = graphql(`
  fragment CreatedUserAccessTokenCache on UserAccessToken {
    id
    name
    createdAt
    expireAt
    lastUsedAt
    source
    scope {
      id
      name
      slug
    }
  }
`);

const EXPIRATION_OPTIONS = [
  { label: "No expiration", days: null },
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
  { label: "1 year", days: 365 },
] as const;

type Account = {
  id: string;
  name?: string | null;
  slug: string;
};

type CreateTokenDialogProps = {
  account: {
    id: string;
    slug: string;
    name?: string | null;
    teams: Account[];
  };
};

type Inputs = {
  name: string;
  accountIds: string[];
  expireInDays: string;
};

const CreatedTokenDialog = ({
  createdToken,
  createdExpireAt,
}: {
  createdToken: string;
  createdExpireAt: string | null;
}) => {
  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Token Created</DialogTitle>
        <DialogText>
          This token grants full API access to your account.{" "}
          <span className="font-medium">Keep it secure</span>.
        </DialogText>
        <Pre code={createdToken} className="mt-4" />
        <div className="text-warning-low flex items-start gap-2 rounded-sm p-2 text-sm">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <p>Copy your token now. You won’t be able to see it again.</p>
        </div>
        {createdExpireAt && (
          <p className="text-low mt-2 text-sm">
            This token expires on{" "}
            <strong>
              {new Date(createdExpireAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </strong>
            .
          </p>
        )}
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Close</DialogDismiss>
      </DialogFooter>
    </Dialog>
  );
};

export function CreateTokenDialog({ account }: CreateTokenDialogProps) {
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdExpireAt, setCreatedExpireAt] = useState<string | null>(null);
  const availableAccounts: Account[] = [
    { id: account.id, name: account.name, slug: account.slug },
    ...account.teams,
  ];
  const form = useForm<Inputs>({
    defaultValues: {
      name: "",
      accountIds: availableAccounts.map((a) => a.id),
      expireInDays: "7",
    },
  });
  const client = useApolloClient();
  const setFormValue = (
    field: keyof Inputs,
    value: any,
    options?: Parameters<typeof form.setValue>[2],
  ) => {
    form.setValue(field, value, {
      shouldDirty: true,
      shouldValidate: true,
      ...options,
    });
  };

  const expireInDaysValue = form.watch("expireInDays");
  const selectedExpiration = EXPIRATION_OPTIONS.find(
    (o) => String(o.days ?? "no-expiration") === expireInDaysValue,
  );
  const expirationDate =
    selectedExpiration?.days != null
      ? new Date(Date.now() + selectedExpiration.days * 24 * 60 * 60 * 1000)
      : null;

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data.accountIds.length === 0) {
      form.setError("accountIds", {
        type: "validate",
        message: "Select at least one account for the token scope",
      });
      return;
    }

    const expireInDays =
      data.expireInDays === "no-expiration"
        ? null
        : parseInt(data.expireInDays, 10);

    const result = await client.mutate({
      mutation: CreateUserAccessTokenMutation,
      variables: {
        input: {
          name: data.name,
          accountIds: data.accountIds,
          expireInDays,
        },
      },
      update(cache, { data: mutationData }) {
        if (!mutationData) {
          return;
        }
        const { createUserAccessToken: newToken } = mutationData;
        const userId = cache.identify({
          __typename: "User",
          id: account.id,
        });

        if (!userId) {
          return;
        }

        const newTokenRef = cache.writeFragment({
          fragment: UserAccessTokenCacheFragment,
          data: newToken.accessToken,
        });

        cache.modify({
          id: userId,
          fields: {
            userAccessTokens(existingTokens = [], { readField }) {
              if (
                existingTokens.some(
                  (tokenRef: Parameters<typeof readField>[1]) =>
                    readField("id", tokenRef) === newToken.accessToken.id,
                )
              ) {
                return existingTokens;
              }
              return [newTokenRef, ...existingTokens];
            },
          },
        });
      },
    });
    if (result.data) {
      setCreatedToken(result.data.createUserAccessToken.token);
      setCreatedExpireAt(
        result.data.createUserAccessToken.accessToken.expireAt ?? null,
      );
    }
  };

  if (createdToken) {
    return (
      <CreatedTokenDialog
        createdToken={createdToken}
        createdExpireAt={createdExpireAt}
      />
    );
  }

  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Create Personal Access Token</DialogTitle>
          <DialogText>
            Personal access tokens allow you to authenticate with the Argos API.
          </DialogText>
          <div className="flex flex-col gap-4">
            <FormTextInput
              control={form.control}
              {...form.register("name", { required: "Token name is required" })}
              autoFocus
              label="Token name"
              placeholder="e.g. My CI token"
            />

            <div>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <label className="text-sm font-medium">Scope</label>
                  <p className="text-low text-xs">
                    Select the accounts this token can access.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onPress={() => {
                      setFormValue(
                        "accountIds",
                        availableAccounts.map((a) => a.id),
                      );
                    }}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onPress={() => {
                      setFormValue("accountIds", []);
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              </div>

              <CheckboxGroupField
                control={form.control}
                name="accountIds"
                isInvalid={Boolean(form.formState.errors.accountIds)}
              >
                {availableAccounts.map((acc) => (
                  <Checkbox key={acc.id} value={acc.id}>
                    {acc.name ?? acc.slug}
                  </Checkbox>
                ))}
              </CheckboxGroupField>
              {form.formState.errors.accountIds && (
                <p className="text-danger-low mt-1 text-xs">
                  {form.formState.errors.accountIds.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Expiration</label>
              <SelectField control={form.control} name="expireInDays">
                <SelectButton className="w-full text-sm">
                  <SelectValue />
                </SelectButton>
                <Popover>
                  <ListBox>
                    {EXPIRATION_OPTIONS.map((option) => (
                      <ListBoxItem
                        key={String(option.days ?? "no-expiration")}
                        id={String(option.days ?? "no-expiration")}
                        textValue={option.label}
                      >
                        {option.label}
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </SelectField>
              {expireInDaysValue === "no-expiration" ? (
                <div className="bg-pending-subtle text-pending-low mt-2 flex items-start gap-2 rounded-md p-2 text-xs">
                  <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Tokens with no expiration never expire. Consider setting an
                    expiration date for better security.
                  </span>
                </div>
              ) : expirationDate ? (
                <p className="text-low mt-1 text-xs">
                  This token will expire on{" "}
                  <strong>
                    {expirationDate.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </strong>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} className="flex-1" />
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control}>Create token</FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}
