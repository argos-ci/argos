import { useApolloClient } from "@apollo/client";
import { forwardRef } from "react";
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
  DialogDisclosure,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Tooltip } from "@/ui/Tooltip";

const TeamFragment = graphql(`
  fragment TeamDelete_Team on Team {
    id
    slug
    subscriptionStatus
    pendingCancelAt
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

const DeleteButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, "color">>(
  (props, ref) => {
    return (
      <Button ref={ref} color="danger" {...props}>
        Delete
      </Button>
    );
  },
);

type DeleteTeamButtonProps = {
  teamAccountId: string;
  teamSlug: string;
};

const DeleteTeamButton = (props: DeleteTeamButtonProps) => {
  const dialog = useDialogState();
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
    <>
      <DialogDisclosure state={dialog}>
        {(disclosureProps) => <DeleteButton {...disclosureProps} />}
      </DialogDisclosure>
      <Dialog state={dialog} style={{ width: 560 }}>
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
              <div className="my-8 rounded bg-danger-hover p-2 text-danger-low">
                <strong>Warning:</strong> This action is not reversible. Please
                be certain.
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
              <FormSubmit color="danger">Delete</FormSubmit>
            </DialogFooter>
          </Form>
        </FormProvider>
      </Dialog>
    </>
  );
};

export const TeamDelete = (props: {
  team: FragmentType<typeof TeamFragment>;
}) => {
  const team = useFragment(TeamFragment, props.team);
  const hasActiveSubscription =
    team.subscriptionStatus === AccountSubscriptionStatus.Active &&
    team.pendingCancelAt === null;
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
      {hasActiveSubscription ? (
        <CardFooter className="flex items-center justify-between">
          <div>
            A subscription is active on the team. Please cancel your
            subscription before deleting the team.
          </div>
          <Tooltip content="Cancel your subscription before deleting the team.">
            <DeleteButton disabled accessibleWhenDisabled />
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
