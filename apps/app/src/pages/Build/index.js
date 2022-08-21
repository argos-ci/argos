/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  LoadingAlert,
  PrimaryTitle,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import BuildDetailScreenshots from "./Screenshots";
import { NotFound } from "../NotFound";
import { useRepository } from "../../containers/RepositoryContext";
import { SummaryCard } from "./SummaryCard";

export const BuildContextFragment = gql`
  fragment BuildContextFragment on Build {
    id
    createdAt
    number
    status
    repository {
      name
      owner {
        login
      }
    }
    baseScreenshotBucket {
      id
      createdAt
      updatedAt
      name
      commit
      branch
    }
    compareScreenshotBucket {
      id
      createdAt
      updatedAt
      name
      commit
      branch
    }
    screenshotDiffs {
      id
      createdAt
      updatedAt
      baseScreenshot {
        id
        name
        url
      }
      compareScreenshot {
        id
        name
        url
      }
      url
      score
      jobStatus
      validationStatus
    }
  }
`;

const BUILD_QUERY = gql`
  query Build(
    $buildNumber: Int!
    $ownerLogin: String!
    $repositoryName: String!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      build(number: $buildNumber) {
        id
        number
        ...BuildContextFragment
      }
    }
  }

  ${BuildContextFragment}
`;

export function Build() {
  const { repository } = useRepository();
  const { buildNumber } = useParams();
  const { loading, data } = useQuery(BUILD_QUERY, {
    variables: {
      ownerLogin: repository.owner.login,
      repositoryName: repository.name,
      buildNumber: Number(buildNumber),
    },
  });

  if (loading) {
    return (
      <Container>
        <LoadingAlert />
      </Container>
    );
  }

  if (!data.repository || !data.repository.build) return <NotFound />;

  const { build } = data.repository;

  return (
    <Container>
      <Helmet>
        <title>{`Build #${build.number}`}</title>
      </Helmet>

      <PrimaryTitle>
        Repository {repository.name} • {`build #${build.number}`}
      </PrimaryTitle>

      <x.div display="flex" flexDirection="column" gap={4}>
        <SummaryCard repository={repository} build={build} />

        {build.screenshotDiffs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Screenshots</CardTitle>
            </CardHeader>
            <CardBody>
              <CardText>No screenshot found.</CardText>
            </CardBody>
          </Card>
        ) : (
          <BuildDetailScreenshots build={build} />
        )}
      </x.div>
    </Container>
  );
}
