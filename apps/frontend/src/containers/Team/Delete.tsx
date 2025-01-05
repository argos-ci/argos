import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { FragmentType, graphql, useFragment } from "@/gql";
import { AccountSubscriptionStatus } from "@/gql/graphql";
import { Button, ButtonProps } from "@/ui/Button";
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
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Modal } from "@/ui/Modal";
import { Tooltip } from "@/ui/Tooltip";

const TeamFragment = graphql(`
  fragment TeamDelete_Team on Team {
    id
    slug
    subscription {
      id
      status
      endDate
    }
  }
`);

type ConfirmDeleteInputs = {
  name: string;
  verify: string;
};

const DeleteTeamMutation = graphql(`
  mutation DeleteTeamMutation($teamAccountId: ID!) {
    deleteTeam(input: { accountId: $teamAccountId })
  }
`);

function DeleteButton(props: Omit<ButtonProps, "variant" | "children">) {
  return (
    <Button variant="destructive" {...props}>
      Delete
    </Button>
  );
}

type DeleteTeamButtonProps = {
  teamAccountId: string;
  teamSlug: string;
};

const DeleteTeamButton = (props: DeleteTeamButtonProps) => {
  return (
    <DialogTrigger>
      <DeleteButton />
      <Modal>
        <TeamDeleteDialog {...props} />
      </Modal>
    </DialogTrigger>
  );
};

function TeamDeleteDialog(props: DeleteTeamButtonProps) {
  const client = useApolloClient();
  const form = useForm<ConfirmDeleteInputs>({
    defaultValues: {
      name: "",
      verify: "",
    },
  });
  const onSubmit: SubmitHandler<ConfirmDeleteInputs> = async () => {
    await client.mutate({
      mutation: DeleteTeamMutation,
      variables: {
        teamAccountId: props.teamAccountId,
      },
    });
    window.location.replace(`/`);
  };
  return (
    <Dialog size="medium">
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <DialogBody>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogText>
              Argos will <strong>delete all of your Team's projects</strong>,
              along with all of its Builds, Screenshots, Screenshot Diffs,
              Settings and other resources belonging to your Team.
            </DialogText>
            <DialogText>
              Your existing subscription will be cancelled, and you will no
            </DialogText>
            <DialogText>
              Argos recommends that you transfer projects you want to keep to
              another Team before deleting this Team.
            </DialogText>
            <div className="bg-danger-hover text-danger-low my-4 rounded p-2">
              <strong>Warning:</strong> This action is not reversible. Please be
              certain.
            </div>
            <FormTextInput
              {...form.register("name", {
                validate: (value) => {
                  if (value !== props.teamSlug) {
                    return "Team name does not match";
                  }
                  return true;
                },
              })}
              className="mb-4"
              label={
                <>
                  Enter the team name <strong>{props.teamSlug}</strong> to
                  continue:
                </>
              }
            />
            <FormTextInput
              {...form.register("verify", {
                validate: (value) => {
                  if (value !== "delete my team") {
                    return "Please type 'delete my team' to confirm";
                  }
                  return true;
                },
              })}
              label={
                <>
                  To verify, type <strong>delete my team</strong> below:
                </>
              }
            />
          </DialogBody>
          <DialogFooter>
            <DialogDismiss>Cancel</DialogDismiss>
            <FormSubmit variant="destructive">Delete</FormSubmit>
          </DialogFooter>
        </Form>
      </FormProvider>
    </Dialog>
  );
}

export const TeamDelete = (props: {
  team: FragmentType<typeof TeamFragment>;
}) => {
  const team = useFragment(TeamFragment, props.team);
  const hasActiveNonCanceledSubscription =
    team.subscription?.status === AccountSubscriptionStatus.Active &&
    !team.subscription.endDate;
  return (
    <Card intent="danger">
      <CardBody>
        <CardTitle>Delete Team</CardTitle>
        <CardParagraph>
          Permanently remove your Team and all of its contents from the Argos
          platform. This action is not reversible — please continue with
          caution.
        </CardParagraph>
      </CardBody>
      {hasActiveNonCanceledSubscription ? (
        <CardFooter className="flex items-center justify-between gap-4">
          <div>
            A subscription is active on the team. Please cancel your
            subscription before deleting the team.
          </div>
          <Tooltip content="Cancel your subscription before deleting the team.">
            <div className="flex">
              <DeleteButton isDisabled />
            </div>
          </Tooltip>
        </CardFooter>
      ) : (
        <CardFooter className="flex items-center justify-end">
          <DeleteTeamButton teamAccountId={team.id} teamSlug={team.slug} />
        </CardFooter>
      )}
    </Card>
  );
};
