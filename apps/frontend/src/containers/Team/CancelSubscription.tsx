import { useId, useState, type ReactNode } from "react";
import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { BOOK_A_CALL_HREF } from "@/constants";
import { graphql } from "@/gql";
import { SubscriptionCancelReason } from "@/gql/graphql";
import { Button } from "@/ui/Button";
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
import { Label } from "@/ui/Label";
import { Link } from "@/ui/Link";
import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { Modal } from "@/ui/Modal";
import { SelectButton, SelectField, SelectValue } from "@/ui/Select";
import { Textarea } from "@/ui/TextInput";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";

const CancelSubscriptionMutation = graphql(`
  mutation CancelSubscription_cancelSubscription(
    $input: CancelSubscriptionInput!
  ) {
    cancelSubscription(input: $input) {
      id
      subscriptionStatus
      subscription {
        id
        status
        endDate
      }
    }
  }
`);

/**
 * The reasons, in the order a leaving customer is most likely to pick one.
 *
 * The values are Stripe's `cancellation_details.feedback` vocabulary: the same
 * list the billing portal used to show, so no answer is asked twice and the
 * churn reports keep counting the same buckets.
 */
const REASONS: { value: SubscriptionCancelReason; label: string }[] = [
  {
    value: SubscriptionCancelReason.TooExpensive,
    label: "It costs too much",
  },
  {
    value: SubscriptionCancelReason.MissingFeatures,
    label: "A feature we need is missing",
  },
  {
    value: SubscriptionCancelReason.SwitchedService,
    label: "We are moving to another tool",
  },
  {
    value: SubscriptionCancelReason.Unused,
    label: "We do not use Argos enough",
  },
  {
    value: SubscriptionCancelReason.TooComplex,
    label: "It is too hard to set up or to use",
  },
  {
    value: SubscriptionCancelReason.LowQuality,
    label: "It did not work well enough",
  },
  {
    value: SubscriptionCancelReason.CustomerService,
    label: "Support was not good enough",
  },
  { value: SubscriptionCancelReason.Other, label: "Other" },
];

/** What the trigger shows for the chosen reason, with the list unmounted. */
const REASON_LABELS: Record<string, ReactNode> = Object.fromEntries(
  REASONS.map((reason) => [reason.value, reason.label]),
);

type Inputs = {
  reason: SubscriptionCancelReason | null;
  comment: string;
};

export function CancelSubscriptionDialog(props: {
  accountId: string;
  periodEndDate: string | null;
}) {
  return (
    <DialogTrigger>
      <Button variant="secondary">Cancel subscription</Button>
      <Modal>
        <CancelSubscriptionDialogContent {...props} />
      </Modal>
    </DialogTrigger>
  );
}

function CancelSubscriptionDialogContent(props: {
  accountId: string;
  periodEndDate: string | null;
}) {
  const { accountId, periodEndDate } = props;
  const client = useApolloClient();
  const state = useOverlayTriggerState();
  const reasonId = useId();
  const commentId = useId();
  const form = useForm<Inputs>({
    defaultValues: { reason: null, comment: "" },
  });
  const reason = form.watch("reason");
  const error = form.formState.errors.reason;
  const commentRequired = reason === SubscriptionCancelReason.Other;

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const trimmedComment = data.comment.trim();

    // The list and the box are one answer: pick the closest reason, write the
    // one the list does not have, or do both. `useController` carries no rules
    // of its own, so the pair is checked here rather than on the field.
    if (!data.reason && !trimmedComment) {
      form.setError("reason", {
        message: "Tell us why, from the list or in your own words.",
      });
      return;
    }

    // "Other" without words is the one combination that tells us nothing, and
    // the mutation refuses it too. Catch it here rather than on a round trip.
    if (data.reason === SubscriptionCancelReason.Other && !trimmedComment) {
      form.setError("reason", {
        message: "Tell us what went wrong so we can fix it.",
      });
      return;
    }

    await client.mutate({
      mutation: CancelSubscriptionMutation,
      variables: {
        input: {
          accountId,
          // Words with nothing picked are Stripe's `other`, which is exactly
          // what that bucket means: a reason the list does not carry.
          reason: data.reason ?? SubscriptionCancelReason.Other,
          comment: trimmedComment || null,
        },
      },
    });
    toast.success("Your subscription has been canceled.");
    state.close();
  };

  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Cancel subscription</DialogTitle>
          <DialogText>
            Your team keeps every Pro feature until the end of the period you
            have already paid for
            {periodEndDate ? (
              <>
                , on <Time date={periodEndDate} format="longDate" />.
              </>
            ) : (
              "."
            )}{" "}
            Nothing is deleted.
          </DialogText>

          <div className="my-4 flex flex-col gap-4">
            <div className="flex flex-col">
              <Label htmlFor={reasonId} invalid={Boolean(error)}>
                Why are you leaving?
              </Label>
              <SelectField
                control={form.control}
                name="reason"
                id={reasonId}
                placeholder="Choose a reason"
                items={REASON_LABELS}
              >
                <SelectButton className="w-full">
                  <SelectValue />
                </SelectButton>
                <ListBox>
                  {REASONS.map((item) => (
                    <ListBoxItem key={item.value} value={item.value}>
                      <ListBoxItemLabel>{item.label}</ListBoxItemLabel>
                    </ListBoxItem>
                  ))}
                </ListBox>
              </SelectField>
              {/* No label of its own: it answers the question above, either as
                  the reason the list does not have or as the detail behind the
                  one that was picked. */}
              <Textarea
                id={commentId}
                rows={3}
                scale="sm"
                className="mt-2"
                aria-label="Why are you leaving, in your own words"
                aria-invalid={error ? "true" : undefined}
                placeholder={
                  commentRequired
                    ? "Tell us what went wrong"
                    : reason
                      ? "Tell us more, if you want to"
                      : "Or tell us in your own words"
                }
                {...form.register("comment")}
              />
              {typeof error?.message === "string" && (
                <ErrorMessage className="mt-2">{error.message}</ErrorMessage>
              )}
            </div>

            {reason === SubscriptionCancelReason.TooExpensive && <PriceOffer />}
          </div>
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} />
          <DialogDismiss>Keep my subscription</DialogDismiss>
          <FormSubmit control={form.control} variant="destructive">
            Cancel subscription
          </FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

/**
 * Price is the one objection a conversation can still answer, so it is the one
 * reason that opens an offer, in place, as soon as it is picked.
 *
 * Flat, with its heading doing the work a surface would otherwise do: the block
 * appearing is what draws the eye, and a filled card carrying an action of its
 * own would outrank the one the customer came for.
 */
function PriceOffer() {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-sm font-medium">Before you go</div>
      <p className="text-low text-sm">
        The price is usually something we can work on. Would you like to{" "}
        <Link href={BOOK_A_CALL_HREF} target="_blank">
          book a 15-minute call
        </Link>{" "}
        to go through the options?
      </p>
    </div>
  );
}

const ResumeSubscriptionMutation = graphql(`
  mutation CancelSubscription_resumeSubscription(
    $input: ResumeSubscriptionInput!
  ) {
    resumeSubscription(input: $input) {
      id
      subscriptionStatus
      subscription {
        id
        status
        endDate
      }
    }
  }
`);

/**
 * The way back from a scheduled cancellation. It has to live in the app: the
 * portal's renew button belongs to the cancellation section we turned off to
 * keep the survey from being asked twice.
 */
export function ResumeSubscriptionButton(props: { accountId: string }) {
  const client = useApolloClient();
  const [pending, setPending] = useState(false);

  return (
    <Button
      pending={pending}
      onClick={async () => {
        setPending(true);
        try {
          await client.mutate({
            mutation: ResumeSubscriptionMutation,
            variables: { input: { accountId: props.accountId } },
          });
          toast.success("Your subscription will renew as usual.");
        } catch {
          toast.error("Something went wrong, please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      Resume subscription
    </Button>
  );
}
