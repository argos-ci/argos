import React from "react";
import { x } from "@xstyled/styled-components";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  BaseLink,
  Icon,
  LinkBlock,
  useDisclosureState,
  DisclosureContent,
  Disclosure,
  CardText,
} from "@argos-ci/app/src/components";
import { GoChevronRight } from "react-icons/go";

export function EmptyScreenshotCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No screenshot found.</CardTitle>
      </CardHeader>
      <CardText>No screenshot found.</CardText>
    </Card>
  );
}

function Screenshot({ screenshot, title }) {
  if (!screenshot?.url) return <x.div flex={1 / 3} />;

  return (
    <BaseLink href={screenshot.url} target="_blank" title={title} flex={1 / 3}>
      <img alt={screenshot.name} src={screenshot.url} />
    </BaseLink>
  );
}

export function ScreenshotsDiffCard({ screenshotDiff, open, ...props }) {
  const { compareScreenshot, baseScreenshot, url } = screenshotDiff;
  const disclosure = useDisclosureState({ defaultOpen: open });

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
            <Icon
              as={GoChevronRight}
              transform
              rotate={disclosure.open ? 90 : 0}
              transitionDuration={300}
              w={4}
              h={4}
            />
          </LinkBlock>
          {compareScreenshot.name}
        </CardTitle>
      </CardHeader>

      <DisclosureContent state={disclosure}>
        <CardBody display="flex" gap={1} p={1}>
          <Screenshot screenshot={baseScreenshot} title="Base screenshot" />
          <Screenshot
            screenshot={compareScreenshot}
            title="Current screenshot"
          />
          <Screenshot screenshot={{ url, name: "diff" }} title="Diff" />
        </CardBody>
      </DisclosureContent>
    </Card>
  );
}
