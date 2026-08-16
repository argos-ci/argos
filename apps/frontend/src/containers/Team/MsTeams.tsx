import { useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import {
  CopyIcon,
  MoreVerticalIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useClipboard } from "use-clipboard-copy";

import { graphql, type DocumentType } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { useAccountContext } from "@/pages/Account";
import { Button, ButtonIcon } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";
import { List, ListRow } from "@/ui/List";
import {
  Menu,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "@/ui/menu-kit";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { Truncable } from "@/ui/Truncable";

import { MsTeamsLogo } from "../MsTeamsLogo";

const _AccountFragment = graphql(`
  fragment TeamMsTeams_Account on Account {
    id
    msTeamsWebhooks {
      id
      name
      url
      connectedAt
    }
  }
`);

const CreateMsTeamsWebhookMutation = graphql(`
  mutation TeamMsTeams_createMsTeamsWebhook(
    $input: CreateMsTeamsWebhookInput!
  ) {
    createMsTeamsWebhook(input: $input) {
      id
      ...TeamMsTeams_Account
    }
  }
`);

const DeleteMsTeamsWebhookMutation = graphql(`
  mutation TeamMsTeams_deleteMsTeamsWebhook(
    $input: DeleteMsTeamsWebhookInput!
  ) {
    deleteMsTeamsWebhook(input: $input) {
      id
      ...TeamMsTeams_Account
    }
  }
`);

const TestMsTeamsWebhookMutation = graphql(`
  mutation TeamMsTeams_testMsTeamsWebhook($input: TestMsTeamsWebhookInput!) {
    testMsTeamsWebhook(input: $input)
  }
`);

type Account = DocumentType<typeof _AccountFragment>;
type MsTeamsWebhook = Account["msTeamsWebhooks"][number];

type Inputs = {
  name: string;
  url: string;
};

export function TeamMsTeams(props: { account: Account }) {
  const { account } = props;
  const { permissions } = useAccountContext();
  const hasAdminPermission = permissions.includes(AccountPermission.Admin);
  const client = useApolloClient();

  const form = useForm<Inputs>({
    defaultValues: { name: "", url: "" },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: CreateMsTeamsWebhookMutation,
      variables: {
        input: {
          accountId: account.id,
          name: data.name,
          url: data.url,
        },
      },
    });
    form.reset({ name: "", url: "" });
    toast.success("Microsoft Teams channel connected", {
      id: "ms-teams-connected",
    });
  };

  return (
    <Card id="ms-teams">
      <Form form={form} onSubmit={onSubmit} noValidate>
        <CardBody>
          <CardTitle>Microsoft Teams</CardTitle>
          <CardParagraph>
            Post build notifications to a Microsoft Teams channel. In Teams,
            open the channel's <strong>More options</strong> menu, add a{" "}
            <strong>Workflows &rsaquo; Send webhook alerts to a channel</strong>{" "}
            flow, then paste the URL it gives you here.
          </CardParagraph>

          {account.msTeamsWebhooks.length > 0 ? (
            <List className="mb-4">
              {account.msTeamsWebhooks.map((webhook) => (
                <ListRow
                  key={webhook.id}
                  className="flex items-center justify-between gap-8 p-4 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <MsTeamsLogo className="size-6 shrink-0" />
                    <div className="min-w-0">
                      <Truncable className="font-medium">
                        {webhook.name}
                      </Truncable>
                      <Truncable className="text-low text-xs">
                        {webhook.url}
                      </Truncable>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-low text-sm">
                      Connected <Time date={webhook.connectedAt} />
                    </div>
                    {hasAdminPermission ? (
                      <WebhookActionsMenu webhook={webhook} />
                    ) : null}
                  </div>
                </ListRow>
              ))}
            </List>
          ) : (
            <p className="text-low mb-4 text-sm">
              No Microsoft Teams channel connected.
            </p>
          )}

          {hasAdminPermission ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <FormTextInput
                control={form.control}
                {...form.register("name", {
                  validate: (value) =>
                    value.trim() ? true : "A name is required",
                })}
                label="Name"
                placeholder="eg. #engineering"
                className="md:w-64"
              />
              <FormTextInput
                control={form.control}
                {...form.register("url", {
                  validate: (value) =>
                    value.trim() ? true : "A webhook URL is required",
                })}
                label="Webhook URL"
                placeholder="https://….environment.api.powerplatform.com/powerautomate/…"
                className="flex-1"
              />
            </div>
          ) : null}
        </CardBody>
        <CardFooter className="flex items-center justify-between gap-4">
          <p>
            Learn more about{" "}
            <Link
              href="https://argos-ci.com/docs/learn/integrations/microsoft-teams-integration"
              target="_blank"
            >
              Microsoft Teams notifications
            </Link>
          </p>
          {hasAdminPermission ? (
            <div className="flex items-center justify-end gap-4">
              <FormRootError control={form.control} />
              <FormSubmit control={form.control} disableIfPristine>
                <ButtonIcon>
                  <PlusIcon />
                </ButtonIcon>
                Add channel
              </FormSubmit>
            </div>
          ) : null}
        </CardFooter>
      </Form>
    </Card>
  );
}

function WebhookActionsMenu(props: { webhook: MsTeamsWebhook }) {
  const { webhook } = props;
  const clipboard = useClipboard();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [testWebhook, { loading }] = useMutation(TestMsTeamsWebhookMutation, {
    variables: { input: { id: webhook.id } },
    onCompleted: () => {
      toast.success(`Test message sent to ${webhook.name}`, {
        id: `ms-teams-test:${webhook.id}`,
      });
    },
    onError: (error) => {
      // Same id as the success case, so retrying replaces the failure notice.
      toast.error(error.message, { id: `ms-teams-test:${webhook.id}` });
    },
  });
  const label = `Actions for ${webhook.name}`;
  return (
    <>
      <MenuRoot>
        <MenuTrigger>
          <Button variant="ghost" iconOnly aria-label={label}>
            <MoreVerticalIcon />
          </Button>
        </MenuTrigger>
        <Menu side="bottom" align="end" aria-label={label}>
          <MenuItem
            icon={<SendIcon />}
            disabled={loading}
            onAction={() => {
              testWebhook().catch(() => {
                // The error is surfaced by `onError`.
              });
            }}
          >
            Send a test message
          </MenuItem>
          <MenuItem
            icon={<CopyIcon />}
            onAction={() => {
              clipboard.copy(webhook.url);
              toast.success("Webhook URL copied to clipboard", {
                id: "ms-teams-webhook-copied",
              });
            }}
          >
            Copy webhook URL
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<Trash2Icon />}
            variant="danger"
            onAction={() => {
              setIsDeleteDialogOpen(true);
            }}
          >
            Remove channel
          </MenuItem>
        </Menu>
      </MenuRoot>
      <Modal isOpen={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DeleteWebhookDialog webhook={webhook} />
      </Modal>
    </>
  );
}

function DeleteWebhookDialog(props: { webhook: MsTeamsWebhook }) {
  const { webhook } = props;
  const state = useOverlayTriggerState();
  const [deleteWebhook, { loading, error }] = useMutation(
    DeleteMsTeamsWebhookMutation,
    {
      variables: { input: { id: webhook.id } },
      onCompleted: () => {
        state.close();
        toast.success("Microsoft Teams channel removed", {
          id: "ms-teams-removed",
        });
      },
    },
  );
  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Remove Microsoft Teams channel</DialogTitle>
        <DialogText>
          Automations posting to <strong>{webhook.name}</strong> will stop
          working. This does not delete the flow on the Teams side.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        {error ? (
          <ErrorMessage className="flex-1">{error.message}</ErrorMessage>
        ) : null}
        <DialogDismiss isDisabled={loading}>Cancel</DialogDismiss>
        <Button
          variant="destructive"
          isPending={loading}
          onPress={() => {
            deleteWebhook().catch(() => {
              // The error is shown in the dialog.
            });
          }}
        >
          Remove
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
