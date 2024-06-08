import { ChevronDownIcon } from "lucide-react";

import { getBuildIcon } from "@/containers/Build";
import { FragmentType, graphql, useFragment } from "@/gql";
import {
  BuildStatus,
  ProjectPermission,
  ValidationStatus,
} from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";

import { useSetValidationStatusMutation } from "./BuildReviewAction";
import { useMarkAllDiffsAsAccepted } from "./BuildReviewState";

const ProjectFragment = graphql(`
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
    }
  }
`);

function BaseReviewButton(props: {
  build: { id: string; status: BuildStatus };
  disabled?: boolean;
  autoFocus?: boolean;
  onCompleted?: () => void;
  children?: React.ReactNode;
}) {
  const markAllDiffsAsAccepted = useMarkAllDiffsAsAccepted();
  const [setValidationStatus, { loading }] = useSetValidationStatusMutation({
    onCompleted: () => {
      markAllDiffsAsAccepted();
      props.onCompleted?.();
    },
  });

  const AcceptIcon = getBuildIcon("check", "accepted");
  const RejectIcon = getBuildIcon("check", "rejected");

  return (
    <MenuTrigger>
      <Button
        className="shrink-0"
        isDisabled={props.disabled || loading}
        autoFocus={props.autoFocus}
      >
        {props.children ?? "Review changes"}
        <ButtonIcon position="right">
          <ChevronDownIcon />
        </ButtonIcon>
      </Button>
      <Popover placement="bottom end">
        <Menu>
          <MenuItem
            onAction={() => {
              setValidationStatus({
                variables: {
                  buildId: props.build.id,
                  validationStatus: ValidationStatus.Accepted,
                },
              });
            }}
            isDisabled={props.build.status === "accepted"}
          >
            <MenuItemIcon className="text-success-low">
              <AcceptIcon />
            </MenuItemIcon>
            Approve changes
          </MenuItem>
          <MenuItem
            onAction={() => {
              setValidationStatus({
                variables: {
                  buildId: props.build.id,
                  validationStatus: ValidationStatus.Rejected,
                },
              });
            }}
            isDisabled={props.build.status === "rejected"}
          >
            <MenuItemIcon className="text-danger-low">
              <RejectIcon />
            </MenuItemIcon>
            Reject changes
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

export function DisabledBuildReviewButton(props: { tooltip: React.ReactNode }) {
  return (
    <Tooltip content={props.tooltip}>
      <div>
        <Button isDisabled>Review changes</Button>
      </div>
    </Tooltip>
  );
}

export function BuildReviewButton(props: {
  project: FragmentType<typeof ProjectFragment>;
  autoFocus?: boolean;
  onCompleted?: () => void;
  children?: React.ReactNode;
}) {
  const project = useFragment(ProjectFragment, props.project);
  if (
    !project.build ||
    !project.account ||
    ![
      BuildStatus.Accepted,
      BuildStatus.Rejected,
      BuildStatus.DiffDetected,
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
