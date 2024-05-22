import { useMutation } from "@apollo/client";
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

import { useMarkAllDiffsAsAccepted } from "../BuildReviewState";

const ProjectFragment = graphql(`
  fragment ReviewButton_Project on Project {
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

const SetValidationStatusMutation = graphql(`
  mutation setValidationStatus(
    $buildId: ID!
    $validationStatus: ValidationStatus!
  ) {
    setValidationStatus(
      buildId: $buildId
      validationStatus: $validationStatus
    ) {
      id
      status
    }
  }
`);

interface BaseReviewButtonProps {
  build: { id: string; status: BuildStatus };
  disabled?: boolean;
}

const BaseReviewButton = ({
  build,
  disabled = false,
}: BaseReviewButtonProps) => {
  const [setValidationStatus, { loading }] = useMutation(
    SetValidationStatusMutation,
    {
      optimisticResponse: (variables) => ({
        setValidationStatus: {
          id: variables.buildId,
          status:
            variables.validationStatus === ValidationStatus.Accepted
              ? BuildStatus.Accepted
              : variables.validationStatus === ValidationStatus.Rejected
                ? BuildStatus.Rejected
                : BuildStatus.Pending,
        },
      }),
    },
  );

  const AcceptIcon = getBuildIcon("check", "accepted");
  const RejectIcon = getBuildIcon("check", "rejected");

  const markAllDiffsAsAccepted = useMarkAllDiffsAsAccepted();

  return (
    <MenuTrigger>
      <Button className="shrink-0" isDisabled={disabled || loading}>
        Review changes
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
                  buildId: build.id,
                  validationStatus: ValidationStatus.Accepted,
                },
              });
              markAllDiffsAsAccepted();
            }}
            isDisabled={build.status === "accepted"}
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
                  buildId: build.id,
                  validationStatus: ValidationStatus.Rejected,
                },
              });
            }}
            isDisabled={build.status === "rejected"}
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
};

export function DisabledReviewButton(props: { tooltip: React.ReactNode }) {
  return (
    <Tooltip content={props.tooltip}>
      <div>
        <Button isDisabled>Review changes</Button>
      </div>
    </Tooltip>
  );
}

export const ReviewButton = (props: {
  project: FragmentType<typeof ProjectFragment>;
}) => {
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
      <DisabledReviewButton tooltip="You must be a reviewer to approve or reject changes." />
    );
  }

  return <BaseReviewButton build={project.build} />;
};
