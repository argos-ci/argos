import React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { GoRepo } from "react-icons/go";
import {
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbItemMenu,
  BreadcrumbLink,
  Icon,
} from "@argos-ci/app/src/components";
import { useQuery } from "../Apollo";
import { useRepository, RepositoryContextFragment } from "../RepositoryContext";
import { RepositoryBreadcrumbMenu } from "./RepositoryBreadcrumbMenu";

const GET_REPOSITORY = gql`
  query Repository($ownerLogin: String!, $repositoryName: String!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      ...RepositoryContextFragment
    }
  }

  ${RepositoryContextFragment}
`;

export function RepositoryBreadcrumbItem() {
  const { ownerLogin, repositoryName } = useParams();
  const { setRepository } = useRepository();
  const { loading, data = {} } = useQuery(GET_REPOSITORY, {
    variables: { ownerLogin, repositoryName },
    fetchPolicy: "no-cache",
    skip: !ownerLogin || !repositoryName,
  });
  const { repository } = data;

  React.useEffect(() => {
    if (!loading && !!repository) {
      setRepository(repository);
    }
  }, [loading, repository, setRepository]);

  if (!repository) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink
          to={`${repository.owner.login}/${repository.name}/builds`}
        >
          <Icon
            as={GoRepo}
            mt={1}
            width={{ _: 20, md: 25 }}
            height={{ _: 20, md: 25 }}
          />
          {repository.name}
        </BreadcrumbLink>
        <BreadcrumbItemMenu>
          <RepositoryBreadcrumbMenu />
        </BreadcrumbItemMenu>
      </BreadcrumbItem>
    </>
  );
}
