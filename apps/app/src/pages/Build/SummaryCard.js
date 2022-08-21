/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { x } from "@xstyled/styled-components";
import { FaExternalLinkAlt, FaRegClock } from "react-icons/fa";
import { GoGitCommit, GoGitBranch } from "react-icons/go";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  BaseLink,
  Icon,
} from "@argos-ci/app/src/components";
import { StatusIcon } from "../../containers/StatusIcon";
import { getVariantColor } from "../../modules/utils";
import { hasWritePermission } from "../../modules/permissions";
import { UpdateBuildStatusButton } from "./UpdateBuildStatusButton";

const Field = (props) => <x.div py={2} {...props} />;

const FieldName = (props) => (
  <x.div
    display="flex"
    alignItems="center"
    gap="2"
    px={2}
    fontWeight={600}
    color="secondary-text"
    fontSize="sm"
    {...props}
  />
);

const FieldValue = (props) => (
  <x.div
    display="flex"
    alignItems="center"
    gap="2"
    px={2}
    borderRadius="md"
    py={1}
    {...props}
  />
);

const FieldLinkValue = (props) => (
  <FieldValue
    as={BaseLink}
    backgroundColor={{ _: "background", hover: "background-hover" }}
    {...props}
  />
);

export function SummaryCard({ repository, build }) {
  const statusColor = getVariantColor(build.status);
  const date = new Date(build.createdAt);

  return (
    <Card borderLeft={2} borderLeftColor={statusColor} borderRadius="0 md md 0">
      <CardHeader>
        <CardTitle>Build Summary</CardTitle>
        {(true || hasWritePermission(repository)) && (
          <UpdateBuildStatusButton build={build} />
        )}
      </CardHeader>

      <CardBody display="grid" gridTemplateColumn={{ _: 1, md: 2 }}>
        <Field>
          <FieldName>
            Branch <Icon as={FaExternalLinkAlt} w={3} h={3} />
          </FieldName>
          <FieldLinkValue
            href={`https://github.com/${build.repository.owner.login}/${build.repository.name}/tree/${build.compareScreenshotBucket.branch}`}
          >
            <Icon as={GoGitBranch} />
            {build.compareScreenshotBucket.branch}
          </FieldLinkValue>
        </Field>

        <Field gridColumn={{ md: 2 }}>
          <FieldName>Status</FieldName>
          <FieldValue>
            <StatusIcon status={build.status} />
            {build.status}
          </FieldValue>
        </Field>

        <Field>
          <FieldName>
            Commit
            <Icon as={FaExternalLinkAlt} w={3} h={3} />
          </FieldName>
          <FieldLinkValue
            href={`https://github.com/${build.repository.owner.login}/${build.repository.name}/commit/${build.compareScreenshotBucket.commit}`}
          >
            <Icon as={GoGitCommit} />
            <x.div textOverflow="ellipsis" overflow="hidden">
              {build.compareScreenshotBucket.commit}
            </x.div>
          </FieldLinkValue>
        </Field>

        <Field>
          <FieldName>Date and time</FieldName>
          <FieldValue>
            <Icon as={FaRegClock} />
            {date.toLocaleDateString()} at {date.toLocaleTimeString()}
          </FieldValue>
        </Field>
      </CardBody>
    </Card>
  );
}
