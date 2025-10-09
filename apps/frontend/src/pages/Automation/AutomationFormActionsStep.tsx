import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { TriangleAlertIcon } from "lucide-react";
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
import { getSlackAuthURL } from "@/util/slack";

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
        teamName
        isUpToDate
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

  // ---
  // When we add a second action, types will break here, we will need to handle it
  // not sure how to do that yet
  // ---

  invariant(data.account, "Account data is required for Slack installation");

  const slackInstallation = data.account.slackInstallation;

  // Refetch the Slack installation when the window becomes active again.
  useRefetchWhenActive({
    refetch,
    skip: Boolean(slackInstallation?.isUpToDate),
  });

  if (!slackInstallation) {
    return (
      <div className="flex flex-col items-start gap-3 p-2">
        <p>
          To post to a Slack channel, you need to connect your Slack workspace
          first.
        </p>
        <LinkButton
          href={`/${params.accountSlug}/settings#slack`}
          target="_blank"
        >
          Connect Slack
        </LinkButton>
      </div>
    );
  }

  if (!slackInstallation.isUpToDate) {
    return (
      <div className="text-warning-low flex flex-col items-start gap-3 p-2">
        <p>
          <TriangleAlertIcon className="inline size-4" /> Slack permissions need
          an update, please reconnect to be able to post messages in channels.
        </p>
        <LinkButton
          href={getSlackAuthURL({ accountId: data.account.id })}
          target="_blank"
          variant="google"
        >
          <ButtonIcon>
            <SlackColoredLogo />
          </ButtonIcon>
          Reconnect Slack
        </LinkButton>
      </div>
    );
  }

  return (
    <div>
      Send notification to the {slackInstallation.teamName} workspace to{" "}
      <FormTextInput
        control={form.control}
        {...form.register(`${name}.payload.name`)}
        orientation="horizontal"
        label="Slack Channel Name"
        hiddenLabel
        placeholder="eg. #general, James Brown"
        className="w-52"
        inline
      />{" "}
      (optionnaly an ID:{" "}
      <FormTextInput
        control={form.control}
        {...form.register(`${name}.payload.slackId`)}
        orientation="horizontal"
        label="Slack Channel"
        hiddenLabel
        placeholder="eg. C07VDNT3CTX"
        className="w-36"
        inline
      />
      )
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

export const ACTIONS = [
  {
    type: "sendSlackMessage",
    label: "Post in Slack channel",
    icon: SlackColoredLogo,
  },
];

export function AutomationActionsStep(props: { form: AutomationForm }) {
  const { form } = props;
  const name = "actions" as const;

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
              <Suspense fallback={<div>Loading…</div>}>
                <ActionDetail form={form} name={`${name}.${index}`} />
              </Suspense>
            </RemovableTask>
          );
        })}
        <SelectField
          control={form.control}
          name={name}
          aria-label="Action Types"
          value={null}
          onChange={(key) => {
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
              {ACTIONS.map((action) => (
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
