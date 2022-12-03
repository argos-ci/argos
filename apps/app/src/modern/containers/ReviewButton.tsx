import { useMutation } from "@apollo/client";

import { FragmentType, graphql, useFragment } from "@/gql";
import { BuildStatus, ValidationStatus } from "@/gql/graphql";
import { hasWritePermission } from "@/modern/containers/Permission";
import { Button, ButtonArrow } from "@/modern/ui/Button";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItemIcon,
  useMenuState,
} from "@/modern/ui/Menu";
import { MagicTooltip } from "@/modern/ui/Tooltip";

import { getBuildIcon } from "./Build";

export const RepositoryFragment = graphql(`
  fragment ReviewButton_Repository on Repository {
    name
    permissions
    private
    owner {
      login
      consumptionRatio
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
    }
  );

  const AcceptIcon = getBuildIcon("check", "accepted");
  const RejectIcon = getBuildIcon("check", "rejected");

  return (
    <>
      <MenuButton state={menu} as={Button} disabled={disabled || loading}>
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
          <MenuItemIcon className="text-success-500">
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
          <MenuItemIcon className="text-danger-500">
            <RejectIcon />
          </MenuItemIcon>
          Reject changes
        </MenuItem>
      </Menu>
    </>
  );
};

interface DisabledReviewButtonProps {
  build: BaseReviewButtonProps["build"];
  tooltip: React.ReactNode;
}

const DisabledReviewButton = ({
  build,
  tooltip,
}: DisabledReviewButtonProps) => {
  return (
    <MagicTooltip tooltip={tooltip} variant="info">
      <div className="flex">
        <BaseReviewButton build={build} disabled />
      </div>
    </MagicTooltip>
  );
};

export const ReviewButton = (props: {
  repository: FragmentType<typeof RepositoryFragment>;
}) => {
  const repository = useFragment(RepositoryFragment, props.repository);
  if (
    !repository.build ||
    !repository.owner ||
    !["accepted", "rejected", "diffDetected"].includes(repository.build.status)
  ) {
    return null;
  }

  if (!hasWritePermission(repository)) {
    return (
      <DisabledReviewButton
        build={repository.build}
        tooltip={
          <>
            You must have access to{" "}
            <strong>
              {repository.owner.login}/{repository.name}
            </strong>{" "}
            repository on GitHub to review changes.
          </>
        }
      ></DisabledReviewButton>
    );
  }

  if (
    repository.private &&
    typeof repository.owner.consumptionRatio === "number" &&
    repository.owner.consumptionRatio >= 1
  ) {
    return (
      <DisabledReviewButton
        build={repository.build}
        tooltip={
          <>
            You have hit {repository.owner.consumptionRatio}% of your current
            plan. Please upgrade to unlock build reviews.
          </>
        }
      />
    );
  }

  return <BaseReviewButton build={repository.build} />;
};
