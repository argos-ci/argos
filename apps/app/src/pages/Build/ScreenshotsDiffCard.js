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

export function ScreenshotsDiffCard({
  screenshotDiff,
  opened = true,
  showChanges = true,
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
        <x.div flex={1 / 2}>
          {baseScreenshot?.url ? (
            <BaseLink
              href={baseScreenshot.url}
              target="_blank"
              title="Base screenshot"
            >
              <img
                alt={baseScreenshot.name}
                src={disclosure.open ? baseScreenshot.url : ""}
              />
            </BaseLink>
          ) : null}
        </x.div>

        <x.div flex={1 / 2}>
          {compareScreenshot?.url && screenshotDiff.status !== "stable" ? (
            <BaseLink
              href={compareScreenshot.url}
              target="_blank"
              title="Current screenshot"
              position="relative"
            >
              {showChanges && url ? (
                <x.img
                  src={url}
                  position="absolute"
                  opacity={0.5}
                  backgroundColor="rgba(255, 255, 255, 0.9)"
                />
              ) : null}

              <img
                alt={compareScreenshot.name}
                src={disclosure.open ? compareScreenshot.url : ""}
              />
            </BaseLink>
          ) : null}
        </x.div>
      </CollapseCardBody>
    </CollapseCard>
  );
}
