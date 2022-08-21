/* eslint-disable react/no-unescaped-entities */
import React from "react";
import styled, { x } from "@xstyled/styled-components";
import {
  useDisclosureState,
  Disclosure,
  DisclosureContent,
} from "ariakit/disclosure";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardText,
  Button,
} from "@argos-ci/app/src/components";
import { getVariantColor } from "../../modules/utils";

const StyledImg = styled.img`
  width: 100%;
  display: block;
`;

function getStatus({ jobStatus, score }) {
  if (jobStatus === "complete") {
    return score === 0 ? "success" : "unknown";
  }
  return jobStatus;
}

function ScreenshotDiffItem({
  screenshotDiff: { jobStatus, score, compareScreenshot, baseScreenshot, url },
}) {
  const status = getStatus({ jobStatus, score });
  const disclosure = useDisclosureState({ visible: status !== "success" });

  return (
    <CardBody borderLeft={2} borderColor={getVariantColor(status)}>
      <CardText as="h4">
        <Disclosure as={Button} {...disclosure} mr={20}>
          {disclosure.visible ? "Hide" : "Show"}
        </Disclosure>
        {compareScreenshot.name}
      </CardText>
      <DisclosureContent {...disclosure}>
        {() =>
          disclosure.visible && (
            <x.div row mx={-1}>
              <x.div col={1 / 3} px={1}>
                {baseScreenshot ? (
                  <a
                    href={baseScreenshot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Base screenshot"
                  >
                    <StyledImg
                      alt={baseScreenshot.name}
                      src={baseScreenshot.url}
                    />
                  </a>
                ) : null}
              </x.div>
              <x.div col={1 / 3} px={1}>
                <a
                  href={compareScreenshot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Current screenshot"
                >
                  <StyledImg
                    alt={compareScreenshot.name}
                    src={compareScreenshot.url}
                  />
                </a>
              </x.div>
              <x.div col={1 / 3} px={1}>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Diff"
                  >
                    <StyledImg alt="diff" src={url} />
                  </a>
                )}
              </x.div>
            </x.div>
          )
        }
      </DisclosureContent>
    </CardBody>
  );
}

export default function BuildDetailScreenshots({ build }) {
  const [showPassingScreenshots, setShowPassingScreenshots] =
    React.useState(false);

  const screenshotDiffs = Array.from(build.screenshotDiffs);
  screenshotDiffs.sort((itemA, itemB) =>
    itemA.validationStatus > itemB.validationStatus
      ? -1
      : itemA.validationStatus < itemB.validationStatus
      ? 1
      : 0
  );

  return (
    <x.div row m={-2}>
      <x.div col={1} p={2}>
        <Card>
          <CardHeader>
            <CardTitle>Screenshots</CardTitle>
          </CardHeader>
          {screenshotDiffs.map(
            (screenshotDiff, index) =>
              (showPassingScreenshots || screenshotDiff.score !== 0) && (
                <ScreenshotDiffItem
                  key={index}
                  screenshotDiff={screenshotDiff}
                />
              )
          )}
        </Card>
        <x.div mt={{ _: 3 }}>
          <Button
            onClick={() => setShowPassingScreenshots(!showPassingScreenshots)}
          >
            {showPassingScreenshots
              ? "Hide passing screenshots"
              : "Show passing screenshots"}
          </Button>
        </x.div>
      </x.div>
    </x.div>
  );
}
