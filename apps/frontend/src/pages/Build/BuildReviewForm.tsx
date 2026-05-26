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
import { BUILD_REVIEW_EVENT_DEFINITIONS } from "./BuildReviewEvents";

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
  children?: React.ReactNode;
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
    children,
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
      <DialogBody>
        {children}
        <div className="flex flex-col gap-4">
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
              disabled={form.formState.isSubmitting}
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
        </div>
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

const RADIO_EVENT_ORDER: BuildReviewEvent[] = [
  BuildReviewEvent.Comment,
  BuildReviewEvent.Approve,
  BuildReviewEvent.Reject,
];

function ReviewEventRadioGroup(props: {
  value: BuildReviewEvent;
  onChange: (value: BuildReviewEvent) => void;
  availableEvents: BuildReviewEvent[];
}) {
  const { value, onChange, availableEvents } = props;
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {RADIO_EVENT_ORDER.filter((event) => availableEvents.includes(event)).map(
        (event) => {
          const definition = BUILD_REVIEW_EVENT_DEFINITIONS[event];
          return (
            <ReviewEventRadio
              key={event}
              value={event}
              checked={value === event}
              onChange={() => onChange(event)}
              label={definition.label}
              description={definition.description}
              icon={definition.icon}
            />
          );
        },
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
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  isDisabled?: boolean;
}) {
  const {
    value,
    checked,
    onChange,
    label,
    description,
    icon: Icon,
    isDisabled,
  } = props;
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
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Icon aria-hidden className="size-4" />
          {label}
        </span>
        <span className="text-low text-xs">{description}</span>
      </div>
    </label>
  );
}
