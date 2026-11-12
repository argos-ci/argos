import { useApolloClient, useQuery } from "@apollo/client/react";
import { addDays, diffInCalendarDays } from "@argos/util/date";
import { formatDate } from "@argos/util/date-format";
import { invariant } from "@argos/util/invariant";
import { useForm, type SubmitHandler } from "react-hook-form";

import { graphql } from "@/gql";
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
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Loader } from "@/ui/Loader";
import { toast } from "@/ui/Toaster";

const StaffTrialDialogQuery = graphql(`
  query StaffTrialDialog_team($id: ID!) {
    teamById(id: $id) {
      id
      ... on Team {
        staff {
          trialEndsAt
        }
      }
    }
  }
`);

const StartStaffTrialMutation = graphql(`
  mutation StaffTrialDialog_startStaffTrial($input: StartStaffTrialInput!) {
    startStaffTrial(input: $input) {
      id
      subscriptionStatus
      stripeCustomerId
    }
  }
`);

const ExtendStaffTrialMutation = graphql(`
  mutation StaffTrialDialog_extendStaffTrial($input: ExtendStaffTrialInput!) {
    extendStaffTrial(input: $input) {
      id
      subscriptionStatus
    }
  }
`);

/**
 * What the dialog does: extend the trial a team is on, or start a new one for
 * a team that holds no subscription.
 */
export type StaffTrialMode = "start" | "extend";

/** The length of the trial a team takes out on its own. */
const DEFAULT_DAYS = 14;

/** The mutations only answer the status; the row's plan and usage move too. */
const REFETCH_QUERIES = ["StaffTeams_staffTeams"];

type Inputs = { days: number };

function checkIsValidDays(days: number): boolean {
  return Number.isInteger(days) && days >= 1;
}

export function StaffTrialDialog(props: {
  teamAccountId: string;
  teamName: string;
  mode: StaffTrialMode;
}) {
  const { mode, ...rest } = props;
  if (mode === "start") {
    return <StaffTrialForm {...rest} trialEndsAt={null} />;
  }
  return <ExtendTrialDialog {...rest} />;
}

function ExtendTrialDialog(props: { teamAccountId: string; teamName: string }) {
  const { teamAccountId, teamName } = props;
  // From the network: the list's status says a trial runs, but only a fresh
  // read says until when — and a cached one would predate the last extension.
  const { data, error } = useQuery(StaffTrialDialogQuery, {
    variables: { id: teamAccountId },
    fetchPolicy: "network-only",
  });

  if (!data || error) {
    return (
      <Dialog size="medium">
        <DialogBody>
          <DialogTitle>Extend trial</DialogTitle>
          {error ? (
            <DialogText className="text-danger-low">
              The trial of {teamName} could not be loaded.
            </DialogText>
          ) : (
            <Loader className="text-low size-6" />
          )}
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>Cancel</DialogDismiss>
        </DialogFooter>
      </Dialog>
    );
  }

  const team = data.teamById;
  invariant(
    team?.__typename === "Team" && team.staff,
    "staff could not read the team's staff block",
  );
  const { trialEndsAt } = team.staff;

  // The trial ended, or was converted, after the list was read.
  if (!trialEndsAt) {
    return (
      <Dialog size="medium">
        <DialogBody>
          <DialogTitle>Extend trial</DialogTitle>
          <DialogText>
            <strong>{teamName}</strong> is no longer on a trial. Reload the list
            to see where it stands.
          </DialogText>
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>Close</DialogDismiss>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <StaffTrialForm
      teamAccountId={teamAccountId}
      teamName={teamName}
      trialEndsAt={trialEndsAt}
    />
  );
}

function StaffTrialForm(props: {
  teamAccountId: string;
  teamName: string;
  /** The end of the running trial, null to start a new one from today. */
  trialEndsAt: string | null;
}) {
  const { teamAccountId, teamName, trialEndsAt } = props;
  const state = useOverlayTriggerState();
  const client = useApolloClient();
  const form = useForm<Inputs>({ defaultValues: { days: DEFAULT_DAYS } });
  const days = form.watch("days");

  const now = new Date();
  const currentEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  // Floored like the period countdown on the directory: a trial read moments
  // past its end has not been closed by Stripe yet.
  const daysLeft = currentEnd
    ? Math.max(0, diffInCalendarDays(currentEnd, now))
    : 0;
  const newEnd = checkIsValidDays(days)
    ? addDays(currentEnd ?? now, days)
    : null;

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const input = { teamAccountId, days: data.days };
    if (currentEnd) {
      await client.mutate({
        mutation: ExtendStaffTrialMutation,
        variables: { input },
        refetchQueries: REFETCH_QUERIES,
      });
      toast.success(`Trial of ${teamName} extended by ${data.days} days`);
    } else {
      await client.mutate({
        mutation: StartStaffTrialMutation,
        variables: { input },
        refetchQueries: REFETCH_QUERIES,
      });
      toast.success(`${teamName} is on a ${data.days}-day trial`);
    }
    state.close();
  };

  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit} noValidate>
        <DialogBody>
          <DialogTitle>
            {currentEnd ? "Extend trial" : "Start a trial"}
          </DialogTitle>
          <DialogText>
            {currentEnd ? (
              <>
                Push back the end of the trial <strong>{teamName}</strong> is
                on.
              </>
            ) : (
              <>
                <strong>{teamName}</strong> has no trial running. This starts a
                new one on the Pro plan, in the name of one of its owners.
              </>
            )}{" "}
            Like any trial, it is canceled at its end unless a payment method
            has been added.
          </DialogText>
          <dl
            className="bg-subtle mb-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-sm border p-3 text-sm"
            data-visual-test="transparent"
          >
            <dt className="text-low">Days left</dt>
            <dd className="font-medium tabular-nums">{daysLeft}</dd>
            <dt className="text-low">Ends on</dt>
            <dd>{currentEnd ? formatDate(currentEnd, "longDate") : "—"}</dd>
          </dl>
          <FormTextInput
            control={form.control}
            {...form.register("days", {
              valueAsNumber: true,
              validate: (value) =>
                checkIsValidDays(value) || "Enter a whole number of days",
            })}
            type="number"
            min={1}
            label="Days to add"
            addon="days"
            autoFocus
          />
          <p className="text-low mt-2 text-sm" data-visual-test="transparent">
            New end date:{" "}
            <span className="text-default font-medium">
              {newEnd ? formatDate(newEnd, "longDate") : "—"}
            </span>
          </p>
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} className="flex-1" />
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control}>
            {currentEnd ? "Extend trial" : "Start trial"}
          </FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}
