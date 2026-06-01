import { clsx } from "clsx";
import { Text } from "react-aria-components";
import { useForm, type SubmitHandler } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { BuildReviewEvent } from "@/gql/graphql";
import {
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogTitle,
} from "@/ui/Dialog";
import { type EditorValue } from "@/ui/Editor/Editor";
import { EditorField } from "@/ui/Editor/EditorField";
import { hasEditorContent } from "@/ui/Editor/util";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { Label } from "@/ui/Label";

import { useCreateBuildReviewMutation } from "./BuildReviewAction";
import {
  BUILD_REVIEW_EVENT_DEFINITIONS,
  ReviewEventRadioVariant,
} from "./BuildReviewEvents";

const _BuildFragment = graphql(`
  fragment BuildReviewForm_Build on Build {
    id
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
        <DialogTitle>Review changes</DialogTitle>
        <div className="flex flex-col gap-4">
          <div>
            <Label>
              Add a comment{" "}
              <Text className="text-low text-sm font-normal">(optional)</Text>
            </Label>
            <EditorField
              control={form.control}
              name="body"
              onChange={() => {
                if (bodyError) {
                  form.clearErrors("body");
                }
              }}
              aria-label="Review comment"
              placeholder="Share your feedback, ask a question, or leave a note..."
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
        <FormSubmit control={form.control} autoFocus>
          Submit review
        </FormSubmit>
      </DialogFooter>
    </Form>
  );
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
              variant={definition.variant}
            />
          );
        },
      )}
    </div>
  );
}

const REVIEW_EVENT_THEME_BY_VARIANT: Record<
  ReviewEventRadioVariant,
  { checkedContainer: string; icon: string; iconChecked: string }
> = {
  primary: {
    checkedContainer: "border-success bg-success-app",
    icon: "bg-success-hover text-success-low",
    iconChecked: "bg-success-active text-success-low",
  },
  destructive: {
    checkedContainer: "border-danger bg-danger-app",
    icon: "bg-danger-hover text-danger-low",
    iconChecked: "bg-danger-active text-danger-low",
  },
  secondary: {
    checkedContainer: "border-info bg-info-app",
    icon: "bg-info-hover text-info-low",
    iconChecked: "bg-info-active text-info-low",
  },
};

function ReviewEventRadio(props: {
  value: BuildReviewEvent;
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  isDisabled?: boolean;
  variant: ReviewEventRadioVariant;
}) {
  const {
    value,
    checked,
    onChange,
    label,
    description,
    icon: Icon,
    isDisabled,
    variant,
  } = props;
  const id = `review-event-${value}`;
  const { checkedContainer, icon, iconChecked } =
    REVIEW_EVENT_THEME_BY_VARIANT[variant];
  return (
    <label
      htmlFor={id}
      className={clsx(
        "flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors select-none",
        !checked &&
          "hover:bg-hover hover:border-low active:bg-active active:border-active",
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        checked && checkedContainer,
      )}
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
        className="focus-visible:ring-default focus-visible:ring-2"
      />
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <div
          className={clsx(
            "flex size-10 items-center justify-center rounded-sm",
            checked ? iconChecked : icon,
          )}
        >
          <Icon aria-hidden className="size-4" />
        </div>
        <div>
          <div className={clsx(checked && "text-default")}>{label}</div>
          <span className={clsx("text-low text-xs", checked && "text-default")}>
            {description}
          </span>
        </div>
      </div>
    </label>
  );
}
