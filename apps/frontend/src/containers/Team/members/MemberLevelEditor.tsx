import { useApolloClient } from "@apollo/client/react";

import { DocumentType, graphql } from "@/gql";
import { TeamUserLevel } from "@/gql/graphql";

import { MemberLevelSelect } from "./MemberLevelSelect";

const SetTeamMemberLevelMutation = graphql(`
  mutation SetTeamMemberLevelMutation(
    $teamAccountId: ID!
    $userAccountId: ID!
    $level: TeamUserLevel!
  ) {
    setTeamMemberLevel(
      input: {
        teamAccountId: $teamAccountId
        userAccountId: $userAccountId
        level: $level
      }
    ) {
      id
      level
    }
  }
`);

const _TeamMemberFragment = graphql(`
  fragment MemberLevelEditor_TeamMember on TeamMember {
    id
    level
    user {
      id
    }
  }
`);

export function MemberLevelEditor(props: {
  teamId: string;
  hasFineGrainedAccessControl: boolean;
  member: DocumentType<typeof _TeamMemberFragment>;
}) {
  const { member, hasFineGrainedAccessControl } = props;
  const client = useApolloClient();

  return (
    <MemberLevelSelect
      size="sm"
      className="text-low"
      hasFineGrainedAccessControl={hasFineGrainedAccessControl}
      value={member.level}
      onChange={(value) => {
        client.mutate({
          mutation: SetTeamMemberLevelMutation,
          variables: {
            teamAccountId: props.teamId,
            userAccountId: member.user.id,
            level: value as TeamUserLevel,
          },
          optimisticResponse: {
            setTeamMemberLevel: {
              id: member.user.id,
              level: value as TeamUserLevel,
              __typename: "TeamMember",
            },
          },
        });
      }}
    />
  );
}
