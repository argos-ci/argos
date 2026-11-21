import { useId, useState } from "react";
import type { ApolloClient, Reference } from "@apollo/client";
import type { ModifierDetails } from "@apollo/client/cache";
import { useApolloClient } from "@apollo/client/react";
import { addDays } from "@argos/util/date";
import { formatDate } from "@argos/util/date-format";
import { invariant } from "@argos/util/invariant";
import {
  useController,
  useForm,
  useWatch,
  type Control,
  type SubmitHandler,
} from "react-hook-form";

import { CreatedTokenDialog } from "@/containers/CreatedTokenDialog";
import { graphql } from "@/gql";
import type {
  CreateProjectTokenInput,
  ProjectTokenPermission,
} from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Callout } from "@/ui/Callout";
import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroupField } from "@/ui/CheckboxGroup";
import { Code } from "@/ui/Code";
import {
  Dialog,
  DialogActionButton,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Label } from "@/ui/Label";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { RadioOption, RadioOptionGroup } from "@/ui/RadioOption";
import { SelectButton, SelectField, SelectValue } from "@/ui/Select";

import {
  ALL_PROJECT_TOKEN_PERMISSIONS,
  STANDARD_PERMISSIONS,
  PROJECT_TOKEN_PERMISSIONS,
} from "./permissions";

const CreateProjectTokenMutation = graphql(`
  mutation CreateProjectToken($input: CreateProjectTokenInput!) {
    createProjectToken(input: $input) {
      token
      projectToken {
        id
        ...ProjectTokenList_ProjectToken
      }
      account {
        id
      }
    }
  }
`);

/**
 * Create a token and show it in the lists already in the cache — the
 * account's and each linked project's — rather than refetching them.
 */
export async function createProjectToken(
  client: ApolloClient,
  input: CreateProjectTokenInput,
) {
  const result = await client.mutate({
    mutation: CreateProjectTokenMutation,
    variables: { input },
    update(cache, { data }) {
      if (!data) {
        return;
      }
      const { projectToken, account } = data.createProjectToken;
      const prepend = (
        existingRefs: readonly Reference[] | null,
        { toReference }: ModifierDetails,
      ) => {
        const ref = toReference(projectToken);
        return existingRefs && ref ? [ref, ...existingRefs] : existingRefs;
      };
      cache.modify({
        id: cache.identify(account),
        fields: { projectTokens: prepend },
      });
      for (const project of projectToken.projects) {
        cache.modify({
          id: cache.identify({ __typename: "Project", id: project.id }),
          fields: { tokens: prepend },
        });
      }
    },
  });
  invariant(result.data, "Project token not created");
  return result.data.createProjectToken;
}

const EXPIRATION_OPTIONS = [
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
  { label: "1 year", days: 365 },
  { label: "No expiration", days: null },
] as const;

const NO_EXPIRATION = "no-expiration";

const EXPIRATION_ITEMS = Object.fromEntries(
  EXPIRATION_OPTIONS.map((option) => [
    String(option.days ?? NO_EXPIRATION),
    option.label,
  ]),
);

type Access = "standard" | "advanced";

function checkIsAccess(value: unknown): value is Access {
  return value === "standard" || value === "advanced";
}

type Inputs = {
  name: string;
  projectIds: string[];
  access: Access;
  /** The permissions ticked under "Advanced". */
  permissions: ProjectTokenPermission[];
  expireInDays: string;
};

function getGrantedPermissions(
  data: Pick<Inputs, "access" | "permissions">,
): ProjectTokenPermission[] {
  return data.access === "advanced"
    ? data.permissions
    : [...ALL_PROJECT_TOKEN_PERMISSIONS];
}

export function CreateProjectTokenDialog(props: {
  accountId: string;
  /**
   * The projects the token can be linked to. With a single one, the token is
   * linked to it without asking.
   */
  projects: { id: string; name: string }[];
}) {
  const { accountId, projects } = props;
  const [step, setStep] = useState<
    | { name: "form" }
    | { name: "confirm-no-expiration" }
    | { name: "created"; token: string; expireAt: string | null }
  >({ name: "form" });
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      name: "",
      projectIds: projects.length === 1 ? projects.map((p) => p.id) : [],
      access: "standard",
      permissions: [...ALL_PROJECT_TOKEN_PERMISSIONS],
      expireInDays: "90",
    },
  });

  const create = async (data: Inputs) => {
    const { token, projectToken } = await createProjectToken(client, {
      accountId,
      name: data.name,
      projectIds: data.projectIds,
      permissions: getGrantedPermissions(data),
      expireInDays:
        data.expireInDays === NO_EXPIRATION ? null : Number(data.expireInDays),
    });
    setStep({
      name: "created",
      token,
      expireAt: projectToken.expireAt ?? null,
    });
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data.projectIds.length === 0) {
      form.setError("projectIds", {
        type: "validate",
        message: "Select at least one project",
      });
      return;
    }
    if (getGrantedPermissions(data).length === 0) {
      form.setError("permissions", {
        type: "validate",
        message: "Select at least one permission",
      });
      return;
    }
    if (data.expireInDays === NO_EXPIRATION) {
      setStep({ name: "confirm-no-expiration" });
      return;
    }
    await create(data);
  };

  switch (step.name) {
    case "created":
      return (
        <CreatedTokenDialog
          title="Project Token Created"
          token={step.token}
          description={
            <>
              Set it as <Code>ARGOS_TOKEN</Code> in your CI to upload builds.{" "}
              <span className="font-medium">Keep it secret</span>.
            </>
          }
        >
          {step.expireAt && (
            <p className="text-low mt-2 text-sm">
              This token expires on{" "}
              <strong>{formatDate(new Date(step.expireAt), "longDate")}</strong>
              . Create its replacement before then.
            </p>
          )}
        </CreatedTokenDialog>
      );
    case "confirm-no-expiration":
      return (
        <NoExpirationDialog
          onBack={() => setStep({ name: "form" })}
          onConfirm={() => create(form.getValues())}
        />
      );
    case "form":
      return (
        <Dialog size="medium">
          <Form form={form} onSubmit={onSubmit}>
            <DialogBody>
              <DialogTitle>Create Project Token</DialogTitle>
              <DialogText>
                CI and the SDK authenticate with a project token, set as{" "}
                <Code>ARGOS_TOKEN</Code>.
              </DialogText>
              <div className="flex flex-col gap-4">
                <FormTextInput
                  control={form.control}
                  {...form.register("name", {
                    required: "Token name is required",
                  })}
                  autoFocus
                  label="Token name"
                  placeholder="e.g. GitHub Actions"
                />
                {projects.length > 1 && (
                  <ProjectsField control={form.control} projects={projects} />
                )}
                <PermissionsField control={form.control} />
                <ExpirationField control={form.control} />
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
}

function ProjectsField(props: {
  control: Control<Inputs>;
  projects: { id: string; name: string }[];
}) {
  const { control, projects } = props;
  const { fieldState } = useController({ control, name: "projectIds" });
  return (
    <div>
      <Label>Projects</Label>
      <div className="max-h-48 overflow-auto rounded-md border p-3">
        <CheckboxGroupField control={control} name="projectIds">
          {projects.map((project) => (
            <Checkbox
              key={project.id}
              name={project.id}
              invalid={Boolean(fieldState.error)}
            >
              {project.name}
            </Checkbox>
          ))}
        </CheckboxGroupField>
      </div>
      {fieldState.error && (
        <ErrorMessage className="mt-2">{fieldState.error.message}</ErrorMessage>
      )}
    </div>
  );
}

function PermissionsField(props: { control: Control<Inputs> }) {
  const { control } = props;
  const labelId = useId();
  const { field: access } = useController({ control, name: "access" });
  const { field: permissions, fieldState } = useController({
    control,
    name: "permissions",
  });
  return (
    <div className="flex flex-col gap-2">
      <div id={labelId} className="text-sm font-semibold">
        Permissions
      </div>
      <RadioOptionGroup
        aria-labelledby={labelId}
        value={access.value}
        onValueChange={(value) => {
          if (!checkIsAccess(value)) {
            return;
          }
          if (value === "advanced" && access.value !== "advanced") {
            permissions.onChange(
              getGrantedPermissions({ access: access.value, permissions: [] }),
            );
          }
          access.onChange(value);
        }}
      >
        <RadioOption
          value="standard"
          label={STANDARD_PERMISSIONS.label}
          description={STANDARD_PERMISSIONS.description}
        />
        <RadioOption
          value="advanced"
          label="Advanced"
          description="Pick individual permissions."
        />
      </RadioOptionGroup>
      {access.value === "advanced" && (
        <div className="pt-2 pl-1">
          <CheckboxGroupField control={control} name="permissions">
            {PROJECT_TOKEN_PERMISSIONS.map((permission) => (
              <Checkbox
                key={permission.value}
                name={permission.value}
                invalid={Boolean(fieldState.error)}
                className="items-start"
              >
                <span className="text-sm">
                  <span className="font-medium">{permission.title}</span>
                  <span className="text-low block text-xs">
                    {permission.description}
                  </span>
                </span>
              </Checkbox>
            ))}
          </CheckboxGroupField>
        </div>
      )}
      {fieldState.error && (
        <ErrorMessage>{fieldState.error.message}</ErrorMessage>
      )}
    </div>
  );
}

function ExpirationField(props: { control: Control<Inputs> }) {
  const { control } = props;
  const expireInDays = useWatch({ control, name: "expireInDays" });
  const days = EXPIRATION_OPTIONS.find(
    (option) => String(option.days ?? NO_EXPIRATION) === expireInDays,
  )?.days;
  return (
    <div>
      <Label>Expiration</Label>
      <SelectField
        control={control}
        name="expireInDays"
        items={EXPIRATION_ITEMS}
      >
        <SelectButton className="w-full text-sm">
          <SelectValue />
        </SelectButton>
        <ListBox>
          {EXPIRATION_OPTIONS.map((option) => (
            <ListBoxItem
              key={String(option.days ?? NO_EXPIRATION)}
              value={String(option.days ?? NO_EXPIRATION)}
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </SelectField>
      {days ? (
        <Callout className="mt-2">
          CI stops uploading on{" "}
          <strong>{formatDate(addDays(new Date(), days), "longDate")}</strong>.
          Create its replacement before then.
        </Callout>
      ) : null}
    </div>
  );
}

function NoExpirationDialog(props: {
  onBack: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { onBack, onConfirm } = props;
  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Create a Token That Never Expires?</DialogTitle>
        <DialogText>
          A token without an expiration date stays valid until someone revokes
          it. If it leaks, anyone who has it keeps access to your projects.
        </DialogText>
        <DialogText>
          Set an expiration date instead, and rotate the token before it
          expires.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onBack}>
          Choose an expiration
        </Button>
        <DialogActionButton variant="destructive" onAsyncAction={onConfirm}>
          Create without expiration
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}
