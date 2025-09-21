import { useApolloClient } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircleIcon } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DocumentType, graphql } from "@/gql";
import { TeamUserLevel } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { CopyButton } from "@/ui/CopyButton";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Label } from "@/ui/Label";
import { Separator } from "@/ui/Separator";

import { MemberLevelSelect } from "./MemberLevelSelect";

const _TeamFragment = graphql(`
  fragment InviteDialog_Team on Team {
    id
    inviteLink
    plan {
      id
      fineGrainedAccessControlIncluded
    }
  }
`);

const InviteMembersMutation = graphql(`
  mutation InviteMembers($input: InviteMembersInput!) {
    inviteMembers(input: $input) {
      id
      ...InvitesList_TeamInvite
    }
  }
`);

const FormSchema = z.object({
  members: z
    .array(
      z.object({
        email: z.email().or(z.literal("")),
        level: z.enum(TeamUserLevel).nonoptional("Level is required"),
      }),
    )
    .min(1, "At least one member is required"),
});

export function InviteDialog(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const client = useApolloClient();
  invariant(team.inviteLink, "Team invite link is required");
  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: { members: [{ email: "", level: TeamUserLevel.Member }] },
  });
  const { isSubmitting } = form.formState;
  const { fields, append } = useFieldArray({
    control: form.control,
    name: "members",
  });
  const state = useOverlayTriggerState();
  return (
    <Dialog size="medium">
      <Form
        form={form}
        onSubmit={async (data) => {
          const validMembers = data.members.filter((m) => m.email);
          if (validMembers.length === 0) {
            form.setError(
              "members.0.email",
              { message: "Email is required" },
              { shouldFocus: true },
            );
            return;
          }
          await client.mutate({
            mutation: InviteMembersMutation,
            variables: {
              input: {
                teamAccountId: team.id,
                members: validMembers,
              },
            },
            refetchQueries: ["TeamMembers_invites"],
          });
          state.close();
          toast.success("Invitations sent successfully");
        }}
        noValidate
      >
        <DialogBody>
          <DialogTitle>Invite to your team</DialogTitle>
          <DialogText>
            Invite new members to your team by sharing the invite link below or
            by entering their email addresses.
          </DialogText>

          <h3 className="text-low mb-2 font-medium">Invite Link</h3>
          <div className="mb-4 flex gap-2 rounded-sm border p-2">
            <pre className="w-0 flex-1 overflow-auto">
              <code>{team.inviteLink}</code>
            </pre>
            <CopyButton text={team.inviteLink} />
          </div>
          <ResetInviteLinkButton
            teamAccountId={team.id}
            isDisabled={isSubmitting}
          />
          <Separator className="my-8" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <div className="flex gap-4">
                <Label className="flex-1">Email address</Label>
                <Label className="flex-1">Role</Label>
              </div>
              <div className="flex flex-col gap-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4">
                    <FormTextInput
                      hiddenLabel
                      label="Email address"
                      control={form.control}
                      placeholder="tony@stark.com"
                      className="flex-1"
                      type="email"
                      autoFocus
                      {...form.register(`members.${index}.email`)}
                    />
                    <Controller
                      control={form.control}
                      name={`members.${index}.level`}
                      render={({ field }) => (
                        <MemberLevelSelect
                          ref={field.ref}
                          hasFineGrainedAccessControl={
                            team.plan?.fineGrainedAccessControlIncluded ?? false
                          }
                          selectedKey={field.value}
                          onSelectionChange={field.onChange}
                          onBlur={field.onBlur}
                          className="flex-1"
                          isDisabled={isSubmitting}
                        />
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                className="self-start"
                onPress={() =>
                  append({ email: "", level: TeamUserLevel.Member })
                }
                isDisabled={fields.length >= 10 || isSubmitting}
              >
                <ButtonIcon>
                  <PlusCircleIcon />
                </ButtonIcon>
                Add more
              </Button>
              {fields.length >= 10 && (
                <div className="text-low text-sm">
                  Maximum of 10 members at once
                </div>
              )}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control}>Invite</FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

const ResetInviteLinkMutation = graphql(`
  mutation ResetInviteLink($teamAccountId: ID!) {
    resetInviteLink(input: { teamAccountId: $teamAccountId }) {
      id
      ...InviteDialog_Team
    }
  }
`);

function ResetInviteLinkButton(props: {
  teamAccountId: string;
  isDisabled?: boolean;
}) {
  const client = useApolloClient();
  return (
    <Button
      onAction={async () => {
        await client.mutate({
          mutation: ResetInviteLinkMutation,
          variables: { teamAccountId: props.teamAccountId },
        });
        toast.success("Invite link reset successfully");
      }}
      variant="secondary"
      className="w-full justify-center"
      isDisabled={props.isDisabled}
    >
      Reset Invite Link
    </Button>
  );
}
