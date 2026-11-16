import { useId, useState } from "react";
import type { Reference } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import {
  useController,
  useForm,
  type Control,
  type SubmitHandler,
} from "react-hook-form";

import { CreatedTokenDialog } from "@/containers/CreatedTokenDialog";
import { graphql } from "@/gql";
import type { WebhookEvent } from "@/gql/graphql";
import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroupField } from "@/ui/CheckboxGroup";
import { Code } from "@/ui/Code";
import {
  Dialog,
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
import { Link } from "@/ui/Link";
import { RadioOption, RadioOptionGroup } from "@/ui/RadioOption";

import { WEBHOOK_EVENTS } from "./events";

const CreateWebhookMutation = graphql(`
  mutation CreateWebhook($input: CreateWebhookInput!) {
    createWebhook(input: $input) {
      secret
      webhook {
        id
        ...WebhookList_Webhook
      }
      account {
        id
      }
    }
  }
`);

type Scope = "all" | "selected";

function checkIsScope(value: unknown): value is Scope {
  return value === "all" || value === "selected";
}

type Inputs = {
  url: string;
  events: WebhookEvent[];
  scope: Scope;
  projectIds: string[];
};

export function CreateWebhookDialog(props: {
  accountId: string;
  projects: { id: string; name: string }[];
}) {
  const { accountId, projects } = props;
  const [secret, setSecret] = useState<string | null>(null);
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      url: "",
      events: WEBHOOK_EVENTS.map((event) => event.value),
      scope: "all",
      projectIds: [],
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (data.events.length === 0) {
      form.setError("events", {
        type: "validate",
        message: "Select at least one event",
      });
      return;
    }
    if (data.scope === "selected" && data.projectIds.length === 0) {
      form.setError("projectIds", {
        type: "validate",
        message: "Select at least one project",
      });
      return;
    }
    const result = await client.mutate({
      mutation: CreateWebhookMutation,
      variables: {
        input: {
          accountId,
          url: data.url,
          events: data.events,
          projectIds: data.scope === "all" ? null : data.projectIds,
        },
      },
      update(cache, { data }) {
        if (!data) {
          return;
        }
        const { webhook, account } = data.createWebhook;
        cache.modify({
          id: cache.identify(account),
          fields: {
            webhooks: (
              existingRefs: readonly Reference[] | null,
              { toReference },
            ) => {
              const ref = toReference(webhook);
              return existingRefs && ref
                ? [ref, ...existingRefs]
                : existingRefs;
            },
          },
        });
      },
    });
    invariant(result.data, "Webhook not created");
    setSecret(result.data.createWebhook.secret);
  };

  if (secret) {
    return (
      <CreatedTokenDialog
        title="Webhook Created"
        token={secret}
        noun="secret"
        description={
          <>
            Argos signs each request with this secret, following{" "}
            <Link href="https://www.standardwebhooks.com" target="_blank">
              Standard Webhooks
            </Link>
            . Verify the <Code>webhook-signature</Code> header to make sure a
            request comes from Argos.{" "}
            <span className="font-medium">Keep it secret</span>.
          </>
        }
      />
    );
  }

  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Add Webhook</DialogTitle>
          <DialogText>
            Argos sends a <Code>POST</Code> request with a JSON body to your
            endpoint each time one of the selected events happens.
          </DialogText>
          <div className="flex flex-col gap-4">
            <FormTextInput
              control={form.control}
              {...form.register("url", {
                validate: (value) =>
                  value.trim() ? true : "An endpoint URL is required",
              })}
              autoFocus
              type="url"
              label="Endpoint URL"
              placeholder="https://example.com/webhooks/argos"
            />
            <EventsField control={form.control} />
            <ProjectsField control={form.control} projects={projects} />
          </div>
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} className="flex-1" />
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control}>Add webhook</FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

function EventsField(props: { control: Control<Inputs> }) {
  const { control } = props;
  const labelId = useId();
  const { fieldState } = useController({ control, name: "events" });
  return (
    <div className="flex flex-col gap-2">
      <div id={labelId} className="text-sm font-semibold">
        Events
      </div>
      <CheckboxGroupField
        control={control}
        name="events"
        aria-labelledby={labelId}
      >
        {WEBHOOK_EVENTS.map((event) => (
          <Checkbox
            key={event.value}
            name={event.value}
            invalid={Boolean(fieldState.error)}
            className="items-start"
          >
            <span className="text-sm">
              <Code>{event.name}</Code>
              <span className="text-low block text-xs">
                {event.description}
              </span>
            </span>
          </Checkbox>
        ))}
      </CheckboxGroupField>
      {fieldState.error && (
        <ErrorMessage>{fieldState.error.message}</ErrorMessage>
      )}
    </div>
  );
}

function ProjectsField(props: {
  control: Control<Inputs>;
  projects: { id: string; name: string }[];
}) {
  const { control, projects } = props;
  const labelId = useId();
  const { field: scope } = useController({ control, name: "scope" });
  const { fieldState } = useController({ control, name: "projectIds" });
  return (
    <div className="flex flex-col gap-2">
      <div id={labelId} className="text-sm font-semibold">
        Projects
      </div>
      <RadioOptionGroup
        aria-labelledby={labelId}
        value={scope.value}
        onValueChange={(value) => {
          if (checkIsScope(value)) {
            scope.onChange(value);
          }
        }}
      >
        <RadioOption
          value="all"
          label="All projects"
          description="Including the projects you create later."
        />
        <RadioOption
          value="selected"
          label="Specific projects"
          description="Only the projects you pick."
        />
      </RadioOptionGroup>
      {scope.value === "selected" && (
        <div className="max-h-48 overflow-auto rounded-md border p-3">
          <CheckboxGroupField
            control={control}
            name="projectIds"
            aria-labelledby={labelId}
          >
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
      )}
      {fieldState.error && (
        <ErrorMessage>{fieldState.error.message}</ErrorMessage>
      )}
    </div>
  );
}
