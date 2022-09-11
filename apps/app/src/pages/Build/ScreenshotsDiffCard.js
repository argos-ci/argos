import * as React from "react";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  BaseLink,
  LinkBlock,
  useDisclosureState,
  DisclosureContent,
  Disclosure,
  Icon,
} from "@argos-ci/app/src/components";
import { ChevronRightIcon } from "@primer/octicons-react";
import { getStatusPrimaryColor } from "../../containers/Status";
import { ScreenshotDiffStatusIcon } from "./ScreenshotDiffStatusIcons";

export const ScreenshotsDiffCardFragment = gql`
  fragment ScreenshotsDiffCardFragment on ScreenshotDiff {
    url
    status
    compareScreenshot {
      id
      name
      url
    }
    baseScreenshot {
      id
      name
      url
    }
  }
`;

export function EmptyScreenshotCard() {
  return (
    <Card>
      <CardHeader border={0}>
        <CardTitle>No screenshot found</CardTitle>
      </CardHeader>
    </Card>
  );
}

function EmptyScreenshot() {
  return <x.div flex={1 / 3} />;
}

function Screenshot({ screenshot, title, visible }) {
  if (!screenshot?.url) return <EmptyScreenshot />;
  const url = visible ? screenshot.url : "";

  return (
    <BaseLink href={url} target="_blank" title={title} flex={1 / 3}>
      <img alt={screenshot.name} src={url} />
    </BaseLink>
  );
}

export function ScreenshotsDiffCard({
  screenshotDiff,
  opened = true,
  ...props
}) {
  const { compareScreenshot, baseScreenshot, url } = screenshotDiff;
  const disclosure = useDisclosureState({ defaultOpen: opened });

  return (
    <Card {...props}>
      <CardHeader
        position="sticky"
        top={40}
        alignSelf="flex-start"
        borderBottom={disclosure.open ? 1 : 0}
      >
        <CardTitle display="flex" alignItems="center" gap={1} fontSize="sm">
          <LinkBlock
            as={Disclosure}
            state={disclosure}
            px={1}
            color="secondary-text"
          >
            <x.div
              as={ChevronRightIcon}
              transform
              rotate={disclosure.open ? 90 : 0}
              transitionDuration={300}
              w={4}
              h={4}
            />
          </LinkBlock>
          <Icon
            as={ScreenshotDiffStatusIcon(screenshotDiff.status)}
            color={getStatusPrimaryColor(screenshotDiff.status)}
          />
          {compareScreenshot.name || baseScreenshot.name}
        </CardTitle>
      </CardHeader>

      <DisclosureContent state={disclosure}>
        <CardBody display="flex" gap={1} p={1}>
          <Screenshot
            screenshot={baseScreenshot}
            title="Base screenshot"
            visible={disclosure.open}
          />

          {compareScreenshot && screenshotDiff.status !== "stable" ? (
            <Screenshot
              screenshot={compareScreenshot}
              title="Current screenshot"
              visible={disclosure.open}
            />
          ) : (
            <EmptyScreenshot />
          )}

          {url ? (
            <Screenshot
              screenshot={{ url, name: "diff" }}
              title="Diff"
              visible={disclosure.open}
            />
          ) : (
            <EmptyScreenshot />
          )}
        </CardBody>
      </DisclosureContent>
    </Card>
  );
}
