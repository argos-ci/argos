import { useId, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { AlertCircleIcon } from "lucide-react";
import {
  useController,
  useForm,
  useWatch,
  type Control,
  type SubmitHandler,
} from "react-hook-form";

import { CreatedTokenDialog } from "@/containers/CreatedTokenDialog";
import { graphql } from "@/gql";
import type { ProjectTokenPermission } from "@/gql/graphql";
import { Button } from "@/ui/Button";
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
  PROJECT_TOKEN_PERMISSIONS,
  PROJECT_TOKEN_PRESETS,
  UPLOAD_PRESET,
  type ProjectTokenPreset,
} from "./permissions";

export const CreateProjectTokenMutation = graphql(`
  mutation CreateProjectToken($input: CreateProjectTokenInput!) {
    createProjectToken(input: $input) {
      token
      projectToken {
        id
        ...ProjectTokenList_ProjectToken
        projects {
          id
          tokens {
            id
            ...ProjectTokenList_ProjectToken
          }
        }
      }
      account {
        id
        projectTokens {
          id
          ...ProjectTokenList_ProjectToken
        }
      }
    }
  }
`);

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

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type Access = ProjectTokenPreset["value"] | "advanced";

function checkIsAccess(value: unknown): value is Access {
  return (
    value === "advanced" ||
    PROJECT_TOKEN_PRESETS.some((preset) => preset.value === value)
  );
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
  if (data.access === "advanced") {
    return data.permissions;
  }
  const preset = PROJECT_TOKEN_PRESETS.find(
    (preset) => preset.value === data.access,
  );
  return preset ? [...preset.permissions] : [];
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
      access: UPLOAD_PRESET.value,
      permissions: [...UPLOAD_PRESET.permissions],
      expireInDays: "90",
    },
  });

  const create = async (data: Inputs) => {
    const result = await client.mutate({
      mutation: CreateProjectTokenMutation,
      variables: {
        input: {
          accountId,
          name: data.name,
          projectIds: data.projectIds,
          permissions: getGrantedPermissions(data),
          expireInDays:
            data.expireInDays === NO_EXPIRATION
              ? null
              : Number(data.expireInDays),
        },
      },
    });
    if (result.data) {
      const { token, projectToken } = result.data.createProjectToken;
      setStep({
        name: "created",
        token,
        expireAt: projectToken.expireAt ?? null,
      });
    }
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
              This token expires on <strong>{formatDate(step.expireAt)}</strong>
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

/**
 * A preset per common use, like the OAuth consent screen; "Advanced" reveals
 * the individual permissions, starting from the preset it replaces.
 */
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
        {PROJECT_TOKEN_PRESETS.map((preset) => (
          <RadioOption
            key={preset.value}
            value={preset.value}
            label={preset.label}
            description={preset.description}
          />
        ))}
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
        <div className="bg-pending-subtle text-pending-low mt-2 flex items-start gap-2 rounded-md p-2 text-xs">
          <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            CI stops uploading on{" "}
            <strong>
              {formatDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000))}
            </strong>
            . Create its replacement before then.
          </span>
        </div>
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
          it. If it leaks — in a CI log, a forked workflow, a former teammate’s
          machine — whoever holds it can upload to your projects for as long as
          nobody notices.
        </DialogText>
        <DialogText>
          Prefer an expiration date, and rotate the token before it ends: create
          its replacement, update the secret in your CI, then revoke the old
          one.
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
