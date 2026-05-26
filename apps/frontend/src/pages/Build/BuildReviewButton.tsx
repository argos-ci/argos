import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { DialogTrigger } from "react-aria-components";

import { DocumentType, graphql } from "@/gql";
import { BuildStatus, ProjectPermission } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";

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

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        className="shrink-0"
        isDisabled={props.disabled}
        autoFocus={props.autoFocus}
      >
        {props.children ?? "Submit review"}
        <ButtonIcon position="right">
          <ChevronDownIcon />
        </ButtonIcon>
      </Button>
      <Popover placement="bottom end" className="overflow-hidden">
        <Dialog aria-label="Submit review">
          <BuildReviewForm
            build={props.build}
            onSubmitted={() => {
              setIsOpen(false);
              props.onCompleted?.();
            }}
          />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

export function DisabledBuildReviewButton(props: { tooltip: React.ReactNode }) {
  return (
    <Tooltip content={props.tooltip}>
      <div>
        <Button isDisabled>Submit review</Button>
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
