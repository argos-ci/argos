// import { gql, useMutation } from "@apollo/client";
// import { x } from "@xstyled/styled-components";
import type { Build } from "./Build";
import type { Repository } from "./Repository";
import type { Owner } from "./Owner";

import {
  Menu,
  MenuItem,
  MenuButton,
  useMenuState,
  MenuItemIcon,
} from "@/modern/ui/Menu";
import { MagicTooltip } from "@/modern/ui/Tooltip";
import { Button, ButtonArrow } from "@/modern/ui/Button";
import { getBuildIcon } from "./Build";
import { hasWritePermission } from "@/modern/containers/Permission";
import { gql, useMutation } from "@apollo/client";

interface BaseReviewButtonProps {
  build: Pick<Build, "id" | "status">;
  disabled?: boolean;
}

interface SetValidationStatusVariables {
  buildId: string;
  validationStatus: "accepted" | "rejected";
}

const BaseReviewButton = ({
  build,
  disabled = false,
}: BaseReviewButtonProps) => {
  const menu = useMenuState({ placement: "bottom-end", gutter: 4 });
  const [setValidationStatus, { loading }] = useMutation<
    any,
    SetValidationStatusVariables
  >(
    gql`
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
    `,
    {
      optimisticResponse: (variables: SetValidationStatusVariables) => ({
        setValidationStatus: {
          id: variables.buildId,
          status: variables.validationStatus,
          __typename: "Build",
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
              variables: { buildId: build.id, validationStatus: "accepted" },
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
              variables: { buildId: build.id, validationStatus: "rejected" },
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

export interface ReviewButtonProps {
  repository: Pick<Repository, "name" | "permissions" | "private"> & {
    build: (Pick<Build, "status"> & DisabledReviewButtonProps["build"]) | null;
    owner: Pick<Owner, "login" | "consumptionRatio">;
  };
}

export const ReviewButton = ({ repository }: ReviewButtonProps) => {
  if (
    !repository.build ||
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
    repository.owner.consumptionRatio !== null &&
    repository.owner.consumptionRatio >= 1
  ) {
    return (
      <DisabledReviewButton
        build={repository.build}
        tooltip={
          <>
            You have hit 100% of your screenshots usage. Please upgrade to
            unlock build reviews.
          </>
        }
      />
    );
  }

  return <BaseReviewButton build={repository.build} />;
};
