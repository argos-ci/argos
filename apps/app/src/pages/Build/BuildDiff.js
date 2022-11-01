/* eslint-disable react/no-unescaped-entities */
import {
  ArchiveBoxXMarkIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  DocumentCheckIcon,
  EyeIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { x } from "@xstyled/styled-components";
import moment from "moment";
import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  Alert,
  BaseLink,
  IconButton,
  InlineCode,
  LinkBlock,
  Tooltip,
  TooltipAnchor,
  TooltipHotkey,
  useTooltipState,
} from "@argos-ci/app/src/components";

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
  (
    { activeDiff, setShowChanges, showChanges, previousRank, nextRank },
    ref
  ) => {
    const { ownerLogin, repositoryName, buildNumber } = useParams();
    const buildUrl = `/${ownerLogin}/${repositoryName}/builds/${buildNumber}/new`;

    return (
      <x.div
        ref={ref}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={4}
      >
        <x.div display="flex" alignItems="center">
          <LinkBlock as={BaseLink} to={`${buildUrl}/${previousRank.current}`}>
            <ArrowUpButton />
          </LinkBlock>
          <LinkBlock as={BaseLink} to={`${buildUrl}/${nextRank.current}`}>
            <ArrowDownButton />
          </LinkBlock>
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
    );
  }
);

const FullWidthImage = (props) => (
  <x.img w={1} objectFit="contain" mb={8} {...props} />
);

const ScreenshotAlert = (props) => (
  <Alert color="info" py={8} textAlign="center" {...props} />
);
const AlertIcon = (props) => <x.svg w={16} mb={5} mx="auto" {...props} />;
const AlertTitle = (props) => <x.div fontWeight="semibold" mb={2} {...props} />;
const AlertBody = (props) => <x.div fontSize="sm" {...props} />;

const AddedDiffAlert = () => (
  <ScreenshotAlert>
    <AlertIcon as={PhotoIcon} />
    <AlertTitle>New screenshot</AlertTitle>
    <AlertBody>
      Nothing to compare yet. The baseline build does not contain a screenshot
      with this name.
    </AlertBody>
  </ScreenshotAlert>
);

const FailDiffAlert = () => (
  <ScreenshotAlert>
    <AlertIcon as={XMarkIcon} />
    <AlertTitle>Failure screenshot</AlertTitle>
    <AlertBody>
      <x.div>
        Nothing to compare yet. The baseline build does not contain a screenshot
        with this name.
      </x.div>
      <x.div mt={4} fontSize="xs">
        Failure screenshots are automatically captured when a test fail and
        their filepath end by "failed".
      </x.div>
    </AlertBody>
  </ScreenshotAlert>
);

const RemovedDiffAlert = () => (
  <ScreenshotAlert>
    <AlertIcon as={ArchiveBoxXMarkIcon} />
    <AlertTitle>Screenshot deletion</AlertTitle>
    <AlertBody>
      Nothing to compare. The new build does not contain a screenshot with this
      name.
    </AlertBody>
  </ScreenshotAlert>
);

const StableDiffAlert = () => (
  <ScreenshotAlert>
    <AlertIcon as={DocumentCheckIcon} />
    <AlertTitle>Stable Screenshot</AlertTitle>
    <AlertBody>No visual changes</AlertBody>
  </ScreenshotAlert>
);

const BaselineScreenshot = ({ activeDiff }) => (
  <BaseLink href={activeDiff.baseScreenshot.url} target="_blank">
    <FullWidthImage
      src={activeDiff.baseScreenshot.url}
      alt={activeDiff.baseScreenshot.name}
    />
  </BaseLink>
);

const ChangesScreenshot = ({ activeDiff, showChanges }) => (
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
);

export function BuildDiff({
  baseScreenshotBucket,
  compareScreenshotBucket,
  activeDiff,
  previousRank,
  nextRank,
}) {
  const [showChanges, setShowChanges] = useState(true);

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
        previousRank={previousRank}
        nextRank={nextRank}
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
          {activeDiff.status === "added" ? (
            <AddedDiffAlert />
          ) : activeDiff.status === "failed" ? (
            <FailDiffAlert />
          ) : (
            <BaselineScreenshot
              activeDiff={activeDiff}
              baseScreenshotBucket={baseScreenshotBucket}
            />
          )}
        </x.div>

        <x.div display="flex" flex={1} flexDirection="column">
          <BranchInfo bucket={compareScreenshotBucket} />
          {activeDiff.status === "stable" ? (
            <StableDiffAlert />
          ) : activeDiff.status === "removed" ? (
            <RemovedDiffAlert />
          ) : (
            <ChangesScreenshot
              activeDiff={activeDiff}
              showChanges={showChanges}
              compareScreenshotBucket={compareScreenshotBucket}
            />
          )}
        </x.div>
      </x.div>
    </x.div>
  );
}
