import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";

import {
  ProjectContributorLevelLabel,
  ProjectContributorLevelListBox,
} from "@/containers/ProjectContributor";
import { graphql } from "@/gql";
import { ProjectUserLevel } from "@/gql/graphql";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

import { addContributor, OPTIMISTIC_CONTRIBUTOR_ID } from "./operations";

const AddOrUpdateContributorMutation = graphql(`
  mutation ProjectAddOrUpdateContributorMutation(
    $projectId: ID!
    $userAccountId: ID!
    $level: ProjectUserLevel!
  ) {
    addOrUpdateProjectContributor(
      input: {
        projectId: $projectId
        userAccountId: $userAccountId
        level: $level
      }
    ) {
      id
      level
    }
  }
`);

export function ProjectContributorLevelSelect(props: {
  projectId: string;
  userId: string;
  level: ProjectUserLevel | "";
}) {
  const [addOrUpdateContributor] = useMutation(AddOrUpdateContributorMutation);

  return (
    <Select
      aria-label="Levels"
      selectedKey={props.level}
      onSelectionChange={(value) => {
        invariant(typeof value === "string");
        addOrUpdateContributor({
          variables: {
            projectId: props.projectId,
            userAccountId: props.userId,
            level: value as ProjectUserLevel,
          },
          optimisticResponse: {
            addOrUpdateProjectContributor: {
              __typename: "ProjectContributor",
              id: OPTIMISTIC_CONTRIBUTOR_ID,
              level: value as ProjectUserLevel,
            },
          },
          update: (cache, { data }) => {
            if (data?.addOrUpdateProjectContributor) {
              addContributor(cache, {
                projectId: props.projectId,
                userId: props.userId,
                contributor: data.addOrUpdateProjectContributor,
              });
            }
          },
        });
      }}
    >
      <SelectButton
        className={clsx("w-full text-sm", !props.level && "text-low")}
      >
        {props.level ? ProjectContributorLevelLabel[props.level] : "Add as"}
      </SelectButton>

      <Popover>
        <ProjectContributorLevelListBox />
      </Popover>
    </Select>
  );
}
