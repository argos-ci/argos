import { useApolloClient, useMutation } from "@apollo/client/react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { graphql, type DocumentType } from "@/gql";
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
  DialogTrigger,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { IconButton } from "@/ui/IconButton";
import { List, ListRow } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { toast } from "@/ui/Toaster";

const _TeamFragment = graphql(`
  fragment TeamDomains_Team on Team {
    id
    teamDomains {
      id
      domain
    }
  }
`);

const AddTeamDomainMutation = graphql(`
  mutation TeamDomains_addTeamDomain($input: AddTeamDomainInput!) {
    addTeamDomain(input: $input) {
      ...TeamDomains_Team
    }
  }
`);

const RemoveTeamDomainMutation = graphql(`
  mutation TeamDomains_removeTeamDomain($input: RemoveTeamDomainInput!) {
    removeTeamDomain(input: $input) {
      ...TeamDomains_Team
    }
  }
`);

type Inputs = {
  domain: string;
};

type TeamDomain = DocumentType<typeof _TeamFragment>["teamDomains"][number];

export function TeamDomains(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      domain: "",
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: AddTeamDomainMutation,
      variables: {
        input: {
          teamAccountId: team.id,
          domain: data.domain,
        },
      },
    });
    form.reset({ domain: "" });
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit} noValidate>
        <CardBody>
          <CardTitle>Team domains</CardTitle>
          <CardParagraph>
            Let people join this team when one of their verified email addresses
            exactly matches a configured domain.
          </CardParagraph>
          {team.teamDomains.length > 0 ? (
            <List className="mb-4">
              {team.teamDomains.map((teamDomain) => (
                <ListRow
                  key={teamDomain.id}
                  className="flex items-center justify-between gap-4 p-4 text-sm"
                >
                  <span className="font-medium">{teamDomain.domain}</span>
                  <DialogTrigger>
                    <IconButton
                      aria-label={`Remove ${teamDomain.domain}`}
                      color="danger"
                    >
                      <Trash2Icon />
                    </IconButton>
                    <Modal>
                      <RemoveTeamDomainDialog teamDomain={teamDomain} />
                    </Modal>
                  </DialogTrigger>
                </ListRow>
              ))}
            </List>
          ) : (
            <p className="text-low mb-4 text-sm">No team domains configured.</p>
          )}
          <FormTextInput
            control={form.control}
            {...form.register("domain", {
              validate: (value) => {
                const domain = value.trim();
                if (!domain) {
                  return "Domain is required";
                }
                if (domain.includes("@")) {
                  return "Enter a domain, not an email address";
                }
                return true;
              },
            })}
            label="Domain"
            placeholder="example.com"
            className="max-w-md"
          />
        </CardBody>
        <CardFooter className="flex items-center justify-between gap-4">
          <div>
            You must have a verified email address for the domain before adding
            it.
          </div>
          <div className="flex items-center justify-end gap-4">
            <FormRootError control={form.control} />
            <FormSubmit control={form.control} disableIfPristine>
              <ButtonIcon>
                <PlusIcon />
              </ButtonIcon>
              Add domain
            </FormSubmit>
          </div>
        </CardFooter>
      </Form>
    </Card>
  );
}

function RemoveTeamDomainDialog(props: { teamDomain: TeamDomain }) {
  const { teamDomain } = props;
  const state = useOverlayTriggerState();
  const [removeTeamDomain, { loading, error }] = useMutation(
    RemoveTeamDomainMutation,
    {
      variables: {
        input: {
          teamDomainId: teamDomain.id,
        },
      },
      onCompleted: () => {
        state.close();
        toast.success("Domain removed");
      },
    },
  );
  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Remove Team Domain</DialogTitle>
        <DialogText>
          People whose verified email address has the exact domain{" "}
          <strong>{teamDomain.domain}</strong> will no longer be able to join
          this team automatically.
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
            removeTeamDomain().catch(() => {
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
