import React from "react";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import { GearIcon, RepoIcon } from "@primer/octicons-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Link,
  TagButton,
  CardText,
  BaseLink,
  Icon,
  IllustratedText,
} from "@argos-ci/app/src/components";
import { DocumentationPhrase } from "../../containers/DocumentationPhrase";
import moment from "moment";
import { StatusIcon } from "../../containers/Status";

export const OwnerRepositoryCardFragment = gql`
  fragment OwnerRepositoryCardFragment on Repository {
    name
    builds(first: 1, after: 0) {
      pageInfo {
        totalCount
      }
      edges {
        id
        updatedAt
        status
        number
      }
    }
  }
`;

const Stat = (props) => (
  <x.div
    display="flex"
    flexDirection={{ _: "row", md: "column" }}
    justifyContent="space-between"
    alignItems="center"
    {...props}
  />
);

const StatLabel = (props) => (
  <x.div
    color="text-secondary"
    fontWeight={600}
    pl={3}
    whiteSpace="nowrap"
    flex={1}
    {...props}
  />
);

const StatValue = (props) => <x.div {...props} px={3} flex={1} />;

const RepositoryStats = ({ buildCount, lastBuild, ...props }) => {
  return (
    <x.div {...props}>
      <x.div
        display="grid"
        gridTemplateColumns={{ _: 1, md: 3 }}
        divideX
        divideColor="border"
      >
        <Stat>
          <StatLabel>Build count</StatLabel>
          <StatValue>{buildCount}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Last build date</StatLabel>
          <StatValue>{moment(lastBuild.updatedAt).fromNow()}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Last build status</StatLabel>
          <StatValue display="flex" gap={1}>
            <StatusIcon
              verticalAlign="text-bottom"
              status={lastBuild.status}
              mt={1}
            />
            {lastBuild.status}
          </StatValue>
        </Stat>
      </x.div>
    </x.div>
  );
};

export function NoRepositoryCard() {
  return (
    <Card>
      <CardHeader border={0}>
        <CardTitle>No repository found</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function ActiveRepositoryCard({ repository, url, ...props }) {
  const {
    pageInfo: { totalCount },
    edges: [lastBuild],
  } = repository.builds;

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle display="flex" alignItems="center" gap={2}>
          <IllustratedText icon={RepoIcon} gap={2}>
            <Link to={`${url}/builds`}>{repository.name}</Link>
          </IllustratedText>
        </CardTitle>
      </CardHeader>
      <CardBody>
        {!lastBuild ? (
          <>
            <CardText fontWeight={600} fontSize="md">
              No Build found.
            </CardText>
            <CardText mt={1} fontWeight={400}>
              <DocumentationPhrase />
            </CardText>
          </>
        ) : (
          <RepositoryStats buildCount={totalCount} lastBuild={lastBuild} />
        )}
      </CardBody>
    </Card>
  );
}

export function InactiveRepositoryCard({ repository, url, ...props }) {
  return (
    <Card {...props}>
      <CardHeader border={0}>
        <CardTitle display="flex" alignItems="flex-start" gap={2}>
          <IllustratedText icon={RepoIcon} gap={2}>
            <Link to={`${url}/builds`}>{repository.name}</Link>
          </IllustratedText>
        </CardTitle>
        <TagButton variant="neutral" as={BaseLink} to={`${url}/settings`}>
          <Icon as={GearIcon} />
          Settings
        </TagButton>
      </CardHeader>
    </Card>
  );
}
