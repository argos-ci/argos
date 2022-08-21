/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import styled, { x } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";
import { FaRegClock } from "react-icons/fa";
import { GoGitCommit, GoGitBranch, GoPulse } from "react-icons/go";
import moment from "moment";
import {
  Container,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  FadeLink,
  Tooltip,
  LoadingAlert,
} from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import { StatusIcon } from "../../containers/StatusIcon";
import { getVariantColor } from "../../modules/utils";
import BuildDetailScreenshots from "./Screenshots";
import BuildDetailAction from "./Action";
import { BuildProvider, BuildContextFragment, useBuild } from "./Context";
// eslint-disable-next-line import/no-cycle
import { NotFound } from "../NotFound";
import { useRepository } from "../../containers/RepositoryContext";
import { hasWritePermission } from "../../modules/permissions";

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

const StyledCardHeader = styled(CardHeader)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

export function Build() {
  const build = useBuild();
  const { status } = build;
  const buildColor = getVariantColor(status);
  const { repository } = useRepository();

  return (
    <Container my={4} position="relative">
      <x.div row m={-2}>
        <x.div col={1} p={2}>
          <Card borderLeft={2} borderColor={buildColor}>
            <StyledCardHeader>
              <CardTitle>Summary</CardTitle>
              {hasWritePermission(repository) && (
                <BuildDetailAction build={build} />
              )}
            </StyledCardHeader>
            <CardBody overflow="hidden">
              <x.div row>
                <x.div col="auto">
                  <StatusIcon status={status} mt={1} mr={2} />
                </x.div>
                <x.div col>
                  <x.div row>
                    <x.div col>
                      <x.div
                        color={buildColor}
                        display="flex"
                        alignItems="center"
                      >
                        <x.div as="strong" mr={2}>
                          {build.compareScreenshotBucket.branch}
                        </x.div>
                        <x.div>{build.compareScreenshotBucket.commit}</x.div>
                      </x.div>
                      <x.div mt={3}>
                        <FadeLink
                          target="_blank"
                          rel="noopener noreferer"
                          href={`https://github.com/${build.repository.owner.login}/${build.repository.name}/commit/${build.compareScreenshotBucket.commit}`}
                          color="white"
                          display="flex"
                          alignItems="center"
                        >
                          <x.svg as={GoGitCommit} mr={2} />
                          Commit{" "}
                          {build.compareScreenshotBucket.commit.slice(0, 7)}
                        </FadeLink>
                        <FadeLink
                          target="_blank"
                          rel="noopener noreferer"
                          href={`https://github.com/${build.repository.owner.login}/${build.repository.name}/tree/${build.compareScreenshotBucket.branch}`}
                          color="white"
                          display="flex"
                          alignItems="center"
                        >
                          <x.svg as={GoGitBranch} mr={2} />
                          Branch {build.compareScreenshotBucket.branch}
                        </FadeLink>
                      </x.div>
                    </x.div>
                    <x.div col={{ _: 1, md: "auto" }} mt={{ _: 3, md: 0 }}>
                      <x.div
                        color={buildColor}
                        display="flex"
                        alignItems="center"
                      >
                        <x.svg as={GoPulse} mr={2} />
                        <span>
                          #{build.number} {status}
                        </span>
                      </x.div>
                      <x.div
                        mt={3}
                        display="flex"
                        alignItems="center"
                        data-tip={moment(build.createdAt).format(
                          "DD-MM-YYYY HH:MM"
                        )}
                      >
                        <x.svg as={FaRegClock} mr={2} />
                        {moment(build.createdAt).fromNow()}
                      </x.div>
                      <Tooltip />
                    </x.div>
                  </x.div>
                </x.div>
              </x.div>
            </CardBody>
          </Card>
        </x.div>
      </x.div>
      {build.screenshotDiffs.length === 0 ? (
        <x.div row m={-2}>
          <x.div col={1} p={2}>
            <Card>
              <CardHeader>
                <CardTitle>Screenshots</CardTitle>
              </CardHeader>
              <CardBody>
                <CardText>No screenshot found.</CardText>
              </CardBody>
            </Card>
          </x.div>
        </x.div>
      ) : (
        <BuildDetailScreenshots build={build} />
      )}
    </Container>
  );
}

export function BuildDetail() {
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
    <>
      <Helmet>
        <title>{`Build #${build.number}`}</title>
      </Helmet>
      <BuildProvider build={build}>
        <Build />
      </BuildProvider>
    </>
  );
}
