import { createContext, memo, use, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";
import { ChevronDownIcon } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { BuildReviewEvent } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
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
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Modal, ModalActionContext, ModalProps } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";

import { useCreateBuildReviewMutation } from "./BuildReviewAction";
import { BUILD_REVIEW_EVENT_DEFINITIONS } from "./BuildReviewEvents";
import { useBuildReviewSummary } from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";

const _ProjectFragment = graphql(`
  fragment BuildReviewDialog_Project on Project {
    build(number: $buildNumber) {
      id
      status
      ...BuildReviewAction_Build
    }
  }
`);

type BuildReviewDialogContextValue = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const BuildReviewDialogContext =
  createContext<null | BuildReviewDialogContextValue>(null);

export function useReviewDialog() {
  const context = use(BuildReviewDialogContext);
  invariant(
    context,
    "useReviewDialog must be called in BuildReviewDialogProvider",
  );
  const { setIsOpen } = context;
  return useMemo(
    () => ({
      show: () => setIsOpen(true),
    }),
    [setIsOpen],
  );
}

const BuildReviewModal = memo(function BuildReviewModal(props: {
  isOpen: NonNullable<ModalProps["isOpen"]>;
  onOpenChange: NonNullable<ModalProps["onOpenChange"]>;
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project, isOpen, onOpenChange } = props;
  if (!project.build) {
    return null;
  }
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} isDismissable>
      <BuildReviewDialog
        build={project.build}
        onClose={() => onOpenChange(false)}
      />
    </Modal>
  );
});

type Inputs = {
  body: EditorValue;
};

const MENU_EVENTS: BuildReviewEvent[] = [
  BuildReviewEvent.Approve,
  BuildReviewEvent.Reject,
  BuildReviewEvent.Comment,
];

function BuildReviewDialog(props: {
  build: NonNullable<DocumentType<typeof _ProjectFragment>["build"]>;
  onClose: () => void;
}) {
  const { build, onClose } = props;
  const summary = useBuildReviewSummary();
  invariant(summary, "BuildReviewDialog requires a summary");
  const hasRejected = summary[EvaluationStatus.Rejected].length > 0;
  const pendingCount = summary[EvaluationStatus.Pending].length;
  const rejectedCount = summary[EvaluationStatus.Rejected].length;
  const allAccepted = !hasRejected && pendingCount === 0;

  const [event, setEvent] = useState<BuildReviewEvent>(
    hasRejected ? BuildReviewEvent.Reject : BuildReviewEvent.Approve,
  );

  const form = useForm<Inputs>({
    defaultValues: { body: null },
  });

  const [createReview] = useCreateBuildReviewMutation(build, {
    onCompleted: () => onClose(),
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (event === BuildReviewEvent.Comment && !hasEditorContent(data.body)) {
      form.setError("body", {
        type: "validate",
        message: "A comment is required when leaving a neutral review.",
      });
      return;
    }
    await createReview({
      event,
      body: hasEditorContent(data.body) ? data.body : undefined,
    });
  };

  const bodyError = form.formState.errors.body;
  const definition = BUILD_REVIEW_EVENT_DEFINITIONS[event];
  const Icon = definition.icon;
  const actionContext = use(ModalActionContext);

  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Submit your review</DialogTitle>
          <DialogText>
            {hasRejected ? (
              <>
                During your review,{" "}
                <strong>
                  {rejectedCount === 1
                    ? "1 change has been marked as rejected"
                    : `${rejectedCount} changes have been marked as rejected`}
                </strong>
                .
              </>
            ) : pendingCount > 0 ? (
              <>
                <strong>
                  {pendingCount === 1
                    ? "1 change is still pending review"
                    : `${pendingCount} changes are still pending review`}
                </strong>
                .
              </>
            ) : (
              <>
                <strong>All changes have been marked as accepted.</strong>
              </>
            )}
          </DialogText>
          {allAccepted ? null : (
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
                className="w-full"
                autoFocus={hasRejected}
                disabled={actionContext?.isPending}
              />
              {bodyError?.message ? (
                <ErrorMessage className="mt-2">
                  {String(bodyError.message)}
                </ErrorMessage>
              ) : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} className="flex-1" />
          <DialogDismiss>Cancel</DialogDismiss>
          {allAccepted ? (
            <FormSubmit
              control={form.control}
              variant={definition.color}
              autoFocus
            >
              <ButtonIcon>
                <Icon />
              </ButtonIcon>
              {definition.label}
            </FormSubmit>
          ) : (
            <ButtonGroup>
              <FormSubmit
                control={form.control}
                variant={definition.color}
                autoFocus={!hasRejected}
              >
                <ButtonIcon>
                  <Icon />
                </ButtonIcon>
                {definition.label}
              </FormSubmit>
              <MenuTrigger>
                <Button
                  variant={definition.color}
                  iconOnly
                  aria-label="Change action"
                  isDisabled={actionContext?.isPending}
                >
                  <ChevronDownIcon />
                </Button>
                <Popover placement="bottom end">
                  <Menu
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={[event]}
                    onSelectionChange={(keys) => {
                      if (keys && keys !== "all") {
                        const [key] = keys;
                        if (key) {
                          setEvent(key as BuildReviewEvent);
                        }
                      }
                    }}
                  >
                    {MENU_EVENTS.map((eventKey) => {
                      const eventDef = BUILD_REVIEW_EVENT_DEFINITIONS[eventKey];
                      const EventIcon = eventDef.icon;
                      return (
                        <MenuItem key={eventKey} id={eventKey}>
                          <MenuItemIcon>
                            <EventIcon />
                          </MenuItemIcon>
                          {eventDef.label}
                        </MenuItem>
                      );
                    })}
                  </Menu>
                </Popover>
              </MenuTrigger>
            </ButtonGroup>
          )}
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

export function BuildReviewDialogProvider(props: {
  children: React.ReactNode;
  project: DocumentType<typeof _ProjectFragment> | null;
}) {
  const { project, children } = props;
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ setIsOpen }), []);
  return (
    <>
      {project ? (
        <BuildReviewModal
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          project={project}
        />
      ) : null}
      <BuildReviewDialogContext value={value}>
        {children}
      </BuildReviewDialogContext>
    </>
  );
}
