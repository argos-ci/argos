import { Suspense, useEffect } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { Text } from "react-aria-components";
import { useFieldArray } from "react-hook-form";

import { useRefetchWhenActive } from "@/containers/Apollo";
import { SlackColoredLogo } from "@/containers/Slack";
import { graphql } from "@/gql";
import { ButtonIcon, LinkButton } from "@/ui/Button";
import { FieldError } from "@/ui/FieldError";
import { FormTextInput } from "@/ui/FormTextInput";
import { ListBox, ListBoxItem, ListBoxItemIcon } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { SelectButton, SelectField, SelectValue } from "@/ui/Select";

import { useAccountParams } from "../Account/AccountParams";
import {
  ActionBadge,
  RemovableTask,
  StepTitle,
  type AutomationForm,
} from "./AutomationForm";

const SlackInstallationQuery = graphql(`
  query AutomationFormActionsStep_team($accountSlug: String!) {
    account(slug: $accountSlug) {
      id
      slackInstallation {
        id
      }
    }
  }
`);

function SendSlackMessageAction(props: {
  form: AutomationForm;
  name: `actions.${number}`;
}) {
  const { name, form } = props;
  const params = useAccountParams();
  invariant(params, "Account params are required for Slack installation query");
  const { data, refetch } = useSuspenseQuery(SlackInstallationQuery, {
    variables: {
      accountSlug: params.accountSlug,
    },
  });

  const hasSlackInstallation = Boolean(data.account?.slackInstallation);

  // Refetch the Slack installation when the window becomes active again.
  useRefetchWhenActive({ refetch, skip: hasSlackInstallation });

  if (!data.account?.slackInstallation) {
    return (
      <div className="flex flex-col items-start gap-2 p-2">
        To post to a Slack channel, you need to connect your Slack workspace
        first.
        <LinkButton
          href={`/${params.accountSlug}/settings#slack`}
          target="_blank"
          variant="secondary"
        >
          <ButtonIcon>
            <SlackColoredLogo />
          </ButtonIcon>
          Connect Slack
        </LinkButton>
      </div>
    );
  }

  // When we add a second action, types will break here, we will need to handle it
  // not sure how to do that yet

  return (
    <div className="flex items-center gap-2 overflow-auto">
      <div>Post to Slack channel</div>
      <FormTextInput
        {...form.register(`${name}.payload.slackId`)}
        orientation="horizontal"
        label="Slack Channel"
        hiddenLabel
        placeholder="Channel ID, eg. C07VDNT3CTX"
        className="w-64"
      />
      <FormTextInput
        {...form.register(`${name}.payload.name`)}
        orientation="horizontal"
        label="Slack Channel Name"
        hiddenLabel
        placeholder="name, eg. #general"
        className="w-64"
      />
    </div>
  );
}

function ActionDetail(props: {
  form: AutomationForm;
  name: `actions.${number}`;
}) {
  const { name, form } = props;
  const field = form.watch(name);
  switch (field.type) {
    case "sendSlackMessage":
      return <SendSlackMessageAction form={form} name={name} />;
    default:
      assertNever(field.type, "Unknown action type");
  }
}

export function AutomationActionsStep(props: { form: AutomationForm }) {
  const { form } = props;
  const name = "actions" as const;
  const actions = [
    {
      type: "sendSlackMessage",
      label: "Post in Slack channel",
      icon: SlackColoredLogo,
    },
  ];
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });

  return (
    <div>
      <StepTitle>
        <ActionBadge>Then</ActionBadge> perform these actions
      </StepTitle>
      <div className="flex flex-col gap-2">
        {fields.map((_field, index) => {
          return (
            <RemovableTask key={index} onRemove={() => remove(index)}>
              <Suspense fallback={<div>Loading...</div>}>
                <ActionDetail form={form} name={`${name}.${index}`} />
              </Suspense>
            </RemovableTask>
          );
        })}
        <SelectField
          control={form.control}
          name={name}
          aria-label="Action Types"
          selectedKey={null}
          onSelectionChange={(key) => {
            switch (key) {
              case "sendSlackMessage": {
                append({
                  type: "sendSlackMessage",
                  payload: {
                    name: "",
                    slackId: "",
                  },
                });
                return;
              }
              default:
                throw new Error(`Unknown action type: ${key}`);
            }
          }}
          placeholder="Add action…"
        >
          <SelectButton className="w-full">
            <SelectValue />
          </SelectButton>
          <FieldError />
          <Popover>
            <ListBox>
              {actions.map((action) => (
                <ListBoxItem
                  key={action.type}
                  id={action.type}
                  textValue={action.label}
                >
                  <ListBoxItemIcon>
                    <action.icon />
                  </ListBoxItemIcon>
                  <Text slot="label">{action.label}</Text>
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </SelectField>
      </div>
    </div>
  );
}
