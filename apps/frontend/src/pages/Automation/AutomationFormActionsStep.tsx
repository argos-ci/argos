import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { TriangleAlertIcon } from "lucide-react";
import { Text } from "react-aria-components";
import { useFieldArray } from "react-hook-form";

import { useRefetchWhenActive } from "@/containers/Apollo";
import { DiscordLogo } from "@/containers/DiscordLogo";
import { MsTeamsLogo } from "@/containers/MsTeamsLogo";
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
  RemoveButton,
  StepTitle,
  Task,
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
      msTeamsWebhooks {
        id
        name
      }
      discordWebhooks {
        id
        name
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
          href={`/${params.accountSlug}/settings/integrations#slack`}
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

/**
 * Channel picker for the webhook-based integrations.
 *
 * Teams and Discord differ only in wording and branding: both register one
 * opaque webhook URL per channel on the account, and the action payload is the
 * webhook id in each case.
 */
function SendWebhookMessageAction(props: {
  form: AutomationForm;
  name: `actions.${number}`;
  /** Product name, as it reads mid-sentence. */
  productName: string;
  /** Anchor of the product's card on the integrations settings page. */
  settingsHash: string;
  logo: React.ComponentType;
  webhooks: readonly { id: string; name: string }[];
  /** Called when the account has no webhook yet, to pick one up on focus. */
  refetch: () => void;
}) {
  const {
    name,
    form,
    productName,
    settingsHash,
    logo: Logo,
    webhooks,
    refetch,
  } = props;
  const params = useAccountParams();
  invariant(params, `Account params are required for ${productName} webhooks`);

  // A webhook may have been added in another tab; pick it up on focus.
  useRefetchWhenActive({ refetch, skip: webhooks.length > 0 });

  if (webhooks.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 p-2">
        <p>
          To post to a {productName} channel, you need to connect a channel
          webhook first.
        </p>
        <LinkButton
          href={`/${params.accountSlug}/settings/integrations#${settingsHash}`}
          target="_blank"
        >
          Connect {productName}
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      Send notification to the {productName} channel
      <SelectField
        control={form.control}
        name={`${name}.payload.webhookId`}
        aria-label={`${productName} channel`}
        placeholder="Select a channel…"
      >
        <SelectButton className="w-52">
          <SelectValue />
        </SelectButton>
        <FieldError />
        <Popover>
          <ListBox>
            {webhooks.map((webhook) => (
              <ListBoxItem
                key={webhook.id}
                id={webhook.id}
                textValue={webhook.name}
              >
                <ListBoxItemIcon>
                  <Logo />
                </ListBoxItemIcon>
                <Text slot="label">{webhook.name}</Text>
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </SelectField>
    </div>
  );
}

function SendMsTeamsMessageAction(props: {
  form: AutomationForm;
  name: `actions.${number}`;
}) {
  const params = useAccountParams();
  invariant(params, "Account params are required for Microsoft Teams webhooks");
  const { data, refetch } = useSuspenseQuery(SlackInstallationQuery, {
    variables: { accountSlug: params.accountSlug },
  });

  invariant(data.account, "Account data is required for Microsoft Teams");

  return (
    <SendWebhookMessageAction
      {...props}
      productName="Microsoft Teams"
      settingsHash="ms-teams"
      logo={MsTeamsLogo}
      webhooks={data.account.msTeamsWebhooks}
      refetch={refetch}
    />
  );
}

function SendDiscordMessageAction(props: {
  form: AutomationForm;
  name: `actions.${number}`;
}) {
  const params = useAccountParams();
  invariant(params, "Account params are required for Discord webhooks");
  const { data, refetch } = useSuspenseQuery(SlackInstallationQuery, {
    variables: { accountSlug: params.accountSlug },
  });

  invariant(data.account, "Account data is required for Discord");

  return (
    <SendWebhookMessageAction
      {...props}
      productName="Discord"
      settingsHash="discord"
      logo={DiscordLogo}
      webhooks={data.account.discordWebhooks}
      refetch={refetch}
    />
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
    case "sendMsTeamsMessage":
      return <SendMsTeamsMessageAction form={form} name={name} />;
    case "sendDiscordMessage":
      return <SendDiscordMessageAction form={form} name={name} />;
    default:
      assertNever(field, "Unknown action type");
  }
}

export const ACTIONS = [
  {
    type: "sendSlackMessage",
    label: "Post in Slack channel",
    icon: SlackColoredLogo,
  },
  {
    type: "sendMsTeamsMessage",
    label: "Post in Microsoft Teams channel",
    icon: MsTeamsLogo,
  },
  {
    type: "sendDiscordMessage",
    label: "Post in Discord channel",
    icon: DiscordLogo,
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
            <Task key={index}>
              <Suspense fallback={<div>Loading…</div>}>
                <ActionDetail form={form} name={`${name}.${index}`} />
              </Suspense>
              <RemoveButton onPress={() => remove(index)} />
            </Task>
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
              case "sendMsTeamsMessage": {
                append({
                  type: "sendMsTeamsMessage",
                  payload: { webhookId: "" },
                });
                return;
              }
              case "sendDiscordMessage": {
                append({
                  type: "sendDiscordMessage",
                  payload: { webhookId: "" },
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
