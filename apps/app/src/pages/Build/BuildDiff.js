/* eslint-disable react/no-unescaped-entities */
import { x } from "@xstyled/styled-components";
import moment from "moment";
import {
  IconButton,
  InlineCode,
  BaseLink,
  Alert,
  TooltipAnchor,
  useTooltipState,
  Tooltip,
  TooltipHotkey,
} from "@argos-ci/app/src/components";
import { ArrowUpIcon, ArrowDownIcon, EyeIcon } from "@heroicons/react/24/solid";
import { forwardRef, useLayoutEffect, useRef, useState } from "react";

const BranchInfo = ({ bucket, baseline, ...props }) => {
  return (
    <x.div
      color="secondary-text"
      textAlign="center"
      w={1}
      fontWeight="medium"
      fontSize="xs"
      lineHeight={3}
      mb={4}
      {...props}
    >
      {bucket ? (
        <>
          {baseline ? "Baseline" : "Changes"} from{" "}
          <InlineCode mx={1}>{bucket.branch}</InlineCode>
          <x.div fontSize={11} mt={0.5} fontWeight="normal">
            {moment(bucket.createdAt).fromNow()}
          </x.div>
        </>
      ) : (
        "No baseline to compare"
      )}
    </x.div>
  );
};

const ArrowUpButton = (props) => {
  const tooltip = useTooltipState();

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <IconButton icon={ArrowUpIcon} {...props} />
      </TooltipAnchor>
      <Tooltip state={tooltip}>
        Previous screenshot
        <TooltipHotkey>
          <ArrowUpIcon />
        </TooltipHotkey>
      </Tooltip>
    </>
  );
};

const ArrowDownButton = (props) => {
  const tooltip = useTooltipState();

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <IconButton icon={ArrowDownIcon} {...props} />
      </TooltipAnchor>
      <Tooltip state={tooltip}>
        Next screenshot
        <TooltipHotkey>
          <ArrowDownIcon />
        </TooltipHotkey>
      </Tooltip>
    </>
  );
};

const ToggleChangesButton = (props) => {
  const tooltip = useTooltipState({ placement: "left" });

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <IconButton icon={EyeIcon} color="danger" {...props} />
      </TooltipAnchor>
      <Tooltip state={tooltip}>
        Hide changes overlay
        <TooltipHotkey>D</TooltipHotkey>
      </Tooltip>
    </>
  );
};

const DiffHeader = forwardRef(
  ({ activeDiff, setShowChanges, showChanges }, ref) => (
    <x.div
      ref={ref}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      p={4}
    >
      <x.div display="flex" alignItems="center">
        <ArrowUpButton />
        <ArrowDownButton />
        <x.div ml={3} fontSize="sm" fontWeight="medium" lineHeight={1.2}>
          {activeDiff.compareScreenshot?.name ||
            activeDiff.baseScreenshot?.name}
        </x.div>
      </x.div>

      <x.div display="flex" alignItems="center">
        <ToggleChangesButton
          onClick={() => setShowChanges((prev) => !prev)}
          toggle={showChanges}
        />
      </x.div>
    </x.div>
  )
);

const FullWidthImage = (props) => (
  <x.img w={1} objectFit="contain" mb={8} {...props} />
);

const Baseline = ({ activeDiff }) => {
  return activeDiff.baseScreenshot?.url ? (
    <BaseLink href={activeDiff.baseScreenshot.url} target="_blank">
      <FullWidthImage
        src={activeDiff.baseScreenshot.url}
        alt={activeDiff.baseScreenshot.name}
      />
    </BaseLink>
  ) : (
    <Alert color="info">
      No compare baseline for {activeDiff.status} screenshot.
    </Alert>
  );
};

const Changes = ({ activeDiff, showChanges }) => {
  return activeDiff.compareScreenshot?.url && activeDiff.status !== "stable" ? (
    <BaseLink
      href={activeDiff.compareScreenshot?.url}
      target="_blank"
      position="relative"
      display="inline-block" // fix Firefox bug on "position: relative"
    >
      {showChanges && activeDiff.url ? (
        <FullWidthImage
          src={activeDiff.url}
          position="absolute"
          backgroundColor="rgba(255, 255, 255, 0.8)"
        />
      ) : null}
      <FullWidthImage
        alt={activeDiff.compareScreenshot.name}
        src={activeDiff.compareScreenshot.url}
      />
    </BaseLink>
  ) : (
    <Alert color="info">No change for {activeDiff.status} screenshot.</Alert>
  );
};

export function BuildDiff({
  build,
  activeDiffId,
  showChanges,
  setShowChanges,
}) {
  const {
    baseScreenshotBucket,
    compareScreenshotBucket,
    screenshotDiffs: { edges: screenshotDiffs },
  } = build;

  const activeDiff =
    screenshotDiffs.find(({ id }) => id === activeDiffId) || screenshotDiffs[0];

  const headerRef = useRef();
  const [headerRect, setHeaderRect] = useState(null);
  useLayoutEffect(() => {
    setHeaderRect(headerRef.current?.getBoundingClientRect());
  }, []);

  return (
    <x.div flex="1 1 auto" minW={400}>
      <DiffHeader
        ref={headerRef}
        activeDiff={activeDiff}
        setShowChanges={setShowChanges}
        showChanges={showChanges}
      />

      <x.div
        display="flex"
        justifyContent="space-between"
        gap={6}
        h={`calc(100vh - ${headerRect?.top + headerRect?.height || 0}px)`}
        overflowY="auto"
        pt={2}
        px={4}
      >
        <x.div display="flex" flex={1} flexDirection="column">
          <BranchInfo bucket={baseScreenshotBucket} baseline />
          <Baseline
            activeDiff={activeDiff}
            baseScreenshotBucket={baseScreenshotBucket}
          />
        </x.div>
        <x.div display="flex" flex={1} flexDirection="column">
          <BranchInfo bucket={compareScreenshotBucket} />
          <Changes
            activeDiff={activeDiff}
            showChanges={showChanges}
            compareScreenshotBucket={compareScreenshotBucket}
          />
        </x.div>
      </x.div>
    </x.div>
  );
}
