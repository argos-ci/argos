import type { ApolloCache, Reference } from "@apollo/client";

import { graphql } from "@/gql";
import { ProjectUserLevel } from "@/gql/graphql";

const ProjectContributedOnFragment = graphql(`
  fragment ProjectContributedOnFragment on User {
    projectsContributedOn(first: 1, projectId: $projectId) {
      edges {
        __typename
        id
        level
      }
    }
  }
`);

export const OPTIMISTIC_CONTRIBUTOR_ID = "temp-id";

export function removeContributor(
  cache: ApolloCache,
  data: { projectId: string; userId: string; projectContributorId: string },
) {
  cache.modify({
    id: cache.identify({
      __typename: "Project",
      id: data.projectId,
    }),
    fields: {
      contributors: (existingContributors, { readField }) => {
        return {
          ...existingContributors,
          edges: existingContributors.edges.filter(
            (ref: Reference) =>
              readField("id", ref) !== data.projectContributorId,
          ),
        };
      },
    },
  });
  cache.writeFragment({
    id: cache.identify({ __typename: "User", id: data.userId }),
    fragment: ProjectContributedOnFragment,
    variables: {
      projectId: data.projectId,
    },
    data: {
      projectsContributedOn: {
        edges: [],
      },
    },
  });
}

export function addContributor(
  cache: ApolloCache,
  data: {
    projectId: string;
    userId: string;
    contributor: {
      id: string;
      level: ProjectUserLevel;
    };
  },
) {
  if (data.contributor.id !== OPTIMISTIC_CONTRIBUTOR_ID) {
    cache.modify({
      id: cache.identify({
        __typename: "Project",
        id: data.projectId,
      }),
      fields: {
        contributors: (existingContributors, { readField }) => {
          const newContributor = {
            __typename: "ProjectContributor",
            id: data.contributor.id,
            level: data.contributor.level,
            user: {
              __ref: cache.identify({
                __typename: "User",
                id: data.userId,
              }),
            },
          };
          return {
            ...existingContributors,
            edges: [
              newContributor,
              ...existingContributors.edges.filter(
                (ref: Reference) => readField("id", ref) !== newContributor.id,
              ),
            ],
          };
        },
      },
    });
  }
  cache.writeFragment({
    id: cache.identify({ __typename: "User", id: data.userId }),
    fragment: ProjectContributedOnFragment,
    variables: { projectId: data.projectId },
    data: {
      projectsContributedOn: {
        __typename: "ProjectContributorConnection",
        edges: [
          {
            __typename: "ProjectContributor",
            ...data.contributor,
          },
        ],
      },
    },
  });
}
