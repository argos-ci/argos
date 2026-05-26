import { useForm, type SubmitHandler } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { BuildReviewEvent } from "@/gql/graphql";
import { DialogBody, DialogDismiss, DialogFooter } from "@/ui/Dialog";
import { type EditorValue } from "@/ui/Editor/Editor";
import { EditorField } from "@/ui/Editor/EditorField";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { Label } from "@/ui/Label";

import { useCreateBuildReviewMutation } from "./BuildReviewAction";

const _BuildFragment = graphql(`
  fragment BuildReviewForm_Build on Build {
    id
    status
    ...BuildReviewAction_Build
  }
`);

type Inputs = {
  event: BuildReviewEvent;
  body: EditorValue;
};

export function BuildReviewForm(props: {
  build: DocumentType<typeof _BuildFragment>;
  defaultEvent?: BuildReviewEvent;
  availableEvents?: BuildReviewEvent[];
  onSubmitted?: () => void;
  header?: React.ReactNode;
  cancel?: React.ReactNode;
}) {
  const {
    build,
    defaultEvent = BuildReviewEvent.Approve,
    availableEvents = [
      BuildReviewEvent.Comment,
      BuildReviewEvent.Approve,
      BuildReviewEvent.Reject,
    ],
    onSubmitted,
    header,
    cancel,
  } = props;

  const form = useForm<Inputs>({
    defaultValues: {
      event: defaultEvent,
      body: null,
    },
  });

  const [createReview] = useCreateBuildReviewMutation(build, {
    onCompleted: () => {
      onSubmitted?.();
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (
      data.event === BuildReviewEvent.Comment &&
      !hasEditorContent(data.body)
    ) {
      form.setError("body", {
        type: "validate",
        message: "A comment is required when leaving a neutral review.",
      });
      return;
    }
    await createReview({
      event: data.event,
      body: hasEditorContent(data.body) ? data.body : undefined,
    });
  };

  const eventValue = form.watch("event");
  const bodyError = form.formState.errors.body;

  return (
    <Form form={form} onSubmit={onSubmit}>
      <DialogBody className="flex flex-col gap-4">
        {header}
        <div>
          <Label>Comment</Label>
          <EditorField
            control={form.control}
            name="body"
            onChange={() => {
              if (bodyError) {
                form.clearErrors("body");
              }
            }}
            aria-label="Review comment"
            placeholder="Leave a comment"
            autoFocus
            className="w-md"
          />
          {bodyError?.message ? (
            <ErrorMessage className="mt-2">
              {String(bodyError.message)}
            </ErrorMessage>
          ) : null}
        </div>
        <ReviewEventRadioGroup
          value={eventValue}
          onChange={(value) => {
            form.setValue("event", value, { shouldDirty: true });
          }}
          availableEvents={availableEvents}
        />
      </DialogBody>
      <DialogFooter>
        <FormRootError control={form.control} className="flex-1" />
        {cancel}
        <DialogDismiss>Cancel</DialogDismiss>
        <FormSubmit control={form.control}>Submit review</FormSubmit>
      </DialogFooter>
    </Form>
  );
}

function hasEditorContent(value: EditorValue): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length === 0) {
    return false;
  }
  return content.some((node) => {
    if (!node || typeof node !== "object") {
      return false;
    }
    const text = (node as { text?: string }).text;
    if (typeof text === "string" && text.trim().length > 0) {
      return true;
    }
    const inner = (node as { content?: unknown }).content;
    return Array.isArray(inner) && inner.length > 0;
  });
}

function ReviewEventRadioGroup(props: {
  value: BuildReviewEvent;
  onChange: (value: BuildReviewEvent) => void;
  availableEvents: BuildReviewEvent[];
}) {
  const { value, onChange, availableEvents } = props;
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {availableEvents.includes(BuildReviewEvent.Comment) && (
        <ReviewEventRadio
          value={BuildReviewEvent.Comment}
          checked={value === BuildReviewEvent.Comment}
          onChange={() => onChange(BuildReviewEvent.Comment)}
          label="Comment"
          description="Submit general feedback without explicit approval."
        />
      )}
      {availableEvents.includes(BuildReviewEvent.Approve) && (
        <ReviewEventRadio
          value={BuildReviewEvent.Approve}
          checked={value === BuildReviewEvent.Approve}
          onChange={() => onChange(BuildReviewEvent.Approve)}
          label="Approve"
          description="Submit feedback and approve merging these changes."
        />
      )}
      {availableEvents.includes(BuildReviewEvent.Reject) && (
        <ReviewEventRadio
          value={BuildReviewEvent.Reject}
          checked={value === BuildReviewEvent.Reject}
          onChange={() => onChange(BuildReviewEvent.Reject)}
          label="Reject"
          description="Submit feedback about rejection."
        />
      )}
    </div>
  );
}

function ReviewEventRadio(props: {
  value: BuildReviewEvent;
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  isDisabled?: boolean;
}) {
  const { value, checked, onChange, label, description, isDisabled } = props;
  const id = `review-event-${value}`;
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2 select-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      aria-disabled={isDisabled || undefined}
    >
      <input
        id={id}
        type="radio"
        name="build-review-event"
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={isDisabled}
        className="mt-1"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-low text-xs">{description}</span>
      </div>
    </label>
  );
}
