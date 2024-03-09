import { useMutation } from "@apollo/client";

import { FragmentType, graphql, useFragment } from "@/gql";
import {
  BuildStatus,
  ProjectPermission,
  ValidationStatus,
} from "@/gql/graphql";
import { Button, ButtonArrow } from "@/ui/Button";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItemIcon,
  useMenuState,
} from "@/ui/Menu";
import { Tooltip } from "@/ui/Tooltip";

import { getBuildIcon } from "./Build";

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
  const menu = useMenuState({ placement: "bottom-end", gutter: 4 });
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

  return (
    <>
      <MenuButton
        className="shrink-0"
        state={menu}
        as={Button}
        disabled={disabled || loading}
      >
        Review changes
        <ButtonArrow />
      </MenuButton>
      <Menu state={menu} aria-label="Review choices">
        <MenuItem
          state={menu}
          onClick={() => {
            setValidationStatus({
              variables: {
                buildId: build.id,
                validationStatus: ValidationStatus.Accepted,
              },
            });
            menu.hide();
          }}
          disabled={build.status === "accepted"}
        >
          <MenuItemIcon className="text-success-low">
            <AcceptIcon />
          </MenuItemIcon>
          Approve changes
        </MenuItem>
        <MenuItem
          state={menu}
          onClick={() => {
            setValidationStatus({
              variables: {
                buildId: build.id,
                validationStatus: ValidationStatus.Rejected,
              },
            });
            menu.hide();
          }}
          disabled={build.status === "rejected"}
        >
          <MenuItemIcon className="text-danger-low">
            <RejectIcon />
          </MenuItemIcon>
          Reject changes
        </MenuItem>
      </Menu>
    </>
  );
};

const DisabledReviewButton = ({ tooltip }: { tooltip: React.ReactNode }) => {
  return (
    <Tooltip content={tooltip} variant="info">
      <Button accessibleWhenDisabled disabled>
        Review changes
      </Button>
    </Tooltip>
  );
};

export const ReviewButton = (props: {
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const project = useFragment(ProjectFragment, props.project);
  if (
    !project.build ||
    !project.account ||
    !["accepted", "rejected", "diffDetected"].includes(project.build.status)
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
