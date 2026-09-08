import { useState } from "react";

import { DocumentType, graphql } from "@/gql";
import { BuildStatus, ProjectPermission } from "@/gql/graphql";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { DialogTrigger } from "@/ui/Dialog";
import { Dialog } from "@/ui/Dialog";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";
import { useIsMobile } from "@/ui/useIsMobile";

import { BuildReviewForm } from "./BuildReviewForm";

const _ProjectFragment = graphql(`
  fragment BuildReviewButton_Project on Project {
    name
    permissions
    public
    account {
      id
      slug
    }
    build(number: $buildNumber) {
      id
      status
      ...BuildReviewForm_Build
    }
  }
`);

function BaseReviewButton(props: {
  build: NonNullable<DocumentType<typeof _ProjectFragment>["build"]>;
  disabled?: boolean;
  autoFocus?: boolean;
  onCompleted?: () => void;
  children?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const form = (
    <BuildReviewForm
      build={props.build}
      onSubmitted={() => {
        setIsOpen(false);
        props.onCompleted?.();
      }}
    />
  );

  if (isMobile) {
    return (
      <>
        <Button
          className="shrink-0"
          disabled={props.disabled}
          autoFocus={props.autoFocus}
          onClick={() => setIsOpen(true)}
        >
          {props.children ?? "Submit review"}
        </Button>
        <BottomSheet
          open={isOpen}
          onOpenChange={setIsOpen}
          aria-label="Submit review"
          className="h-auto max-h-[85dvh]"
        >
          {form}
        </BottomSheet>
      </>
    );
  }

  return (
    <DialogTrigger open={isOpen} onOpenChange={setIsOpen}>
      <Button
        className="shrink-0"
        disabled={props.disabled}
        autoFocus={props.autoFocus}
      >
        {props.children ?? "Submit review"}
      </Button>
      <Popover side="bottom" align="end" className="overflow-hidden">
        <Dialog aria-label="Submit review">{form}</Dialog>
      </Popover>
    </DialogTrigger>
  );
}

export function DisabledBuildReviewButton(props: { tooltip: React.ReactNode }) {
  return (
    <Tooltip content={props.tooltip}>
      <div>
        <Button disabled>Submit review</Button>
      </div>
    </Tooltip>
  );
}

export function BuildReviewButton(props: {
  project: DocumentType<typeof _ProjectFragment>;
  autoFocus?: boolean;
  onCompleted?: () => void;
  children?: React.ReactNode;
}) {
  const { project } = props;
  if (
    !project.build ||
    !project.account ||
    ![
      BuildStatus.Accepted,
      BuildStatus.Rejected,
      BuildStatus.ChangesDetected,
    ].includes(project.build.status)
  ) {
    return null;
  }

  if (!project.permissions.includes(ProjectPermission.Review)) {
    return (
      <DisabledBuildReviewButton tooltip="You must be a reviewer to approve or reject changes." />
    );
  }

  return (
    <BaseReviewButton
      build={project.build}
      autoFocus={props.autoFocus}
      onCompleted={props.onCompleted}
    >
      {props.children}
    </BaseReviewButton>
  );
}
