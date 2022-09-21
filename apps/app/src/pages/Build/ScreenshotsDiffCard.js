import * as React from "react";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import {
  Card,
  CardHeader,
  CardTitle,
  BaseLink,
  useDisclosureState,
  Icon,
  CollapseCardHeader,
  CollapseCardTitle,
  CollapseCardBody,
  CollapseCard,
} from "@argos-ci/app/src/components";
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
  const disclosure = useDisclosureState({ defaultOpen: opened });
  const { compareScreenshot, baseScreenshot, url } = screenshotDiff;

  return (
    <CollapseCard {...props}>
      <CollapseCardHeader
        state={disclosure}
        position="sticky"
        top={40}
        alignSelf="flex-start"
      >
        <CollapseCardTitle state={disclosure}>
          <Icon
            as={ScreenshotDiffStatusIcon(screenshotDiff.status)}
            color={getStatusPrimaryColor(screenshotDiff.status)}
          />
          {compareScreenshot?.name || baseScreenshot.name}
        </CollapseCardTitle>
      </CollapseCardHeader>

      <CollapseCardBody state={disclosure} display="flex" gap={1} p={1}>
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
      </CollapseCardBody>
    </CollapseCard>
  );
}
