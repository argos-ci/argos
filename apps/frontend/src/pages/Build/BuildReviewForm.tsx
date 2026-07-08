import { use, useMemo, useState } from "react";
import { clsx } from "clsx";
import { XIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { BuildReviewEvent } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { useOverlayTriggerState } from "@/ui/Dialog";
import { type EditorValue } from "@/ui/Editor/Editor";
import { EditorField } from "@/ui/Editor/EditorField";
import { hasEditorContent } from "@/ui/Editor/util";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form, handleFormError } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { ModalActionContext } from "@/ui/Modal";
import { Tooltip } from "@/ui/Tooltip";
import { getMentionUser } from "@/ui/UserCard";
import { lowTextColorClassNames } from "@/util/colors";

import { useBuildDiffState } from "./BuildDiffState";
import { useCreateBuildReviewMutation } from "./BuildReviewAction";
import { BUILD_REVIEW_EVENT_DEFINITIONS } from "./BuildReviewEvents";
import { useBuildReviewSummary } from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";
import { PendingCommentChip } from "./PendingCommentsSection";
import {
  ReviewProgressBadge,
  useBuildReviewProgression,
} from "./ReviewProgressBadge";

const _BuildFragment = graphql(`
  fragment BuildReviewForm_Build on Build {
    id
    members {
      ...UserCard_user
    }
    ...BuildReviewAction_Build
    ...PendingCommentsSection_Build
  }
`);

type Inputs = {
  body: EditorValue;
};

// Left-to-right order of the submit buttons: neutral, negative, then the
// primary positive action on the right.
const SUBMIT_EVENTS: BuildReviewEvent[] = [
  BuildReviewEvent.Comment,
  BuildReviewEvent.Reject,
  BuildReviewEvent.Approve,
];

export function BuildReviewForm(props: {
  build: DocumentType<typeof _BuildFragment>;
  onSubmitted?: () => void;
  /** Widen the form when hosted in a modal rather than the header popover. */
  size?: "default" | "large";
}) {
  const { build, onSubmitted, size = "default" } = props;

  const state = useOverlayTriggerState();
  // When hosted in a modal, lock dismissal (Escape/backdrop) while a review is
  // in flight. Submitting through the buttons bypasses `Form`'s `onSubmit`
  // wrapper, so we drive the pending state here instead.
  const actionContext = use(ModalActionContext);
  const mentions = useMemo(
    () => build.members.map(getMentionUser),
    [build.members],
  );

  const form = useForm<Inputs>({
    defaultValues: { body: null },
  });

  const [createReview] = useCreateBuildReviewMutation(build, {
    onCompleted: () => {
      onSubmitted?.();
    },
  });

  // Block submission until every diff has been fetched: the review progression
  // and the accept/reject counts are computed from the loaded diffs, so
  // submitting mid-load could approve or reject an incomplete set of changes.
  const { isLoading } = useBuildDiffState();

  // Tracks the action currently being submitted: drives the per-button spinner
  // and disables the rest of the form while the review is in flight.
  const [pendingEvent, setPendingEvent] = useState<BuildReviewEvent | null>(
    null,
  );
  const isSubmitting = pendingEvent !== null;

  // The default action drives both focus and the implicit submit (Enter on the
  // focused button, Cmd+Enter in the editor):
  // - at least one rejection → Reject, and focus the comment field since a note
  //   is expected;
  // - otherwise (all accepted, or nothing reviewed yet) → Approve, so pressing
  //   Enter accepts the changes.
  const progression = useBuildReviewProgression();
  const summary = useBuildReviewSummary();
  const hasRejected = summary
    ? summary[EvaluationStatus.Rejected].length > 0
    : false;
  const defaultEvent = hasRejected
    ? BuildReviewEvent.Reject
    : BuildReviewEvent.Approve;

  const submitReview = async (event: BuildReviewEvent) => {
    if (isLoading) {
      return;
    }
    const { body } = form.getValues();
    if (event === BuildReviewEvent.Comment && !hasEditorContent(body)) {
      form.setError("body", {
        type: "validate",
        message: "A comment is required when leaving a neutral review.",
      });
      return;
    }
    form.clearErrors();
    setPendingEvent(event);
    actionContext?.setIsPending(true);
    try {
      await createReview({
        event,
        body: hasEditorContent(body) ? body : undefined,
      });
      // The mutation closes the dialog through `onCompleted`; keep the pending
      // state until then so the form doesn't flash back to idle and the modal
      // stays locked through the closing animation.
    } catch (error) {
      handleFormError(form, error);
      setPendingEvent(null);
      actionContext?.setIsPending(false);
    }
  };

  const bodyError = form.formState.errors.body;

  return (
    <Form
      form={form}
      onSubmit={() => submitReview(defaultEvent)}
      className={clsx("flex flex-col", size === "large" ? "w-lg" : "w-md")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isSubmitting) {
          state.close();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <ReviewProgressBadge scale="sm" progression={progression} />
          <PendingCommentChip build={build} />
        </div>
        <HotkeyTooltip keys={["Esc"]} description="Hide">
          <Button
            variant="ghost"
            size="small"
            iconOnly
            aria-label="Close"
            rounded
            onPress={() => state.close()}
            isDisabled={isSubmitting}
          >
            <XIcon />
          </Button>
        </HotkeyTooltip>
      </div>
      <div className="px-4 pb-3">
        <EditorField
          control={form.control}
          name="body"
          variant="plain"
          mentions={mentions}
          onChange={() => {
            if (bodyError) {
              form.clearErrors("body");
            }
          }}
          onSubmit={() => submitReview(defaultEvent)}
          aria-label="Review comment"
          placeholder="Add review summary…"
          className="text-sm"
          contentClassName="max-h-64 min-h-16 overflow-y-auto"
          autoFocus={hasRejected}
          disabled={isSubmitting}
        />
        {bodyError?.message ? (
          <ErrorMessage className="mt-2">
            {String(bodyError.message)}
          </ErrorMessage>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <FormRootError control={form.control} />
        <Tooltip
          content={
            isLoading
              ? "Waiting for all changes to load before you can submit a review…"
              : null
          }
        >
          <div className="flex justify-end gap-2">
            {SUBMIT_EVENTS.map((event) => {
              const definition = BUILD_REVIEW_EVENT_DEFINITIONS[event];
              const Icon = definition.icon;
              const isDefault = event === defaultEvent;
              return (
                <Button
                  key={event}
                  variant={definition.variant}
                  rounded
                  size="small"
                  className="shrink-0"
                  isPending={pendingEvent === event}
                  isDisabled={
                    isLoading || (isSubmitting && pendingEvent !== event)
                  }
                  autoFocus={isDefault}
                  // Keep the ring on the focused button (not only keyboard focus)
                  // so the default action Enter triggers stays visible.
                  showFocusRing
                  onAction={() => submitReview(event)}
                >
                  <ButtonIcon>
                    <Icon
                      className={
                        definition.iconColor
                          ? lowTextColorClassNames[definition.iconColor]
                          : undefined
                      }
                    />
                  </ButtonIcon>
                  {definition.label}
                </Button>
              );
            })}
          </div>
        </Tooltip>
      </div>
    </Form>
  );
}
