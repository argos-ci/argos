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
} from "@/components";

const BranchInfo = ({ bucket, baseline }) => {
  if (!bucket) {
    return <div>No baseline to compare</div>;
  }

  return (
    <div>
      <x.div fontWeight="medium" fontSize="xs" lineHeight={3}>
        {baseline ? "Baseline" : "Changes"} from{" "}
        <InlineCode>{bucket.branch}</InlineCode>
      </x.div>
      <x.div fontSize={11} mt={0.5} fontWeight="normal">
        {moment(bucket.createdAt).fromNow()}
      </x.div>
    </div>
  );
};

const ArrowButton = ({ buildUrl, icon: Icon, link, children }) => {
  const tooltip = useTooltipState();
  const disabled = link === undefined;

  return (
    <>
      <TooltipAnchor
        state={tooltip}
        as={LinkBlock}
        to={disabled ? null : `${buildUrl}/${link}`}
        disabled={disabled}
      >
        <IconButton icon={Icon} disabled={disabled} />
      </TooltipAnchor>
      <Tooltip state={tooltip}>
        {children}
        <TooltipHotkey>
          <Icon />
        </TooltipHotkey>
      </Tooltip>
    </>
  );
};

const ToggleChangesButton = (props) => {
  const tooltip = useTooltipState();

  return (
    <>
      <TooltipAnchor state={tooltip}>
        <IconButton icon={EyeIcon} color="danger" {...props} />
      </TooltipAnchor>
      <Tooltip state={tooltip}>
        Hide changes overlay
        <TooltipHotkey>H</TooltipHotkey>
      </Tooltip>
    </>
  );
};

const DiffHeader = forwardRef(
  (
    {
      activeDiff,
      setShowChanges,
      showChanges,
      previousRank,
      nextRank,
      buildUrl,
    },
    ref
  ) => {
    return (
      <x.div
        ref={ref}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        p={4}
        gap={10}
      >
        <x.div display="flex" alignItems="center">
          <ArrowButton
            buildUrl={buildUrl}
            icon={ArrowUpIcon}
            link={previousRank.current}
          >
            Previous screenshot
          </ArrowButton>
          <ArrowButton
            buildUrl={buildUrl}
            icon={ArrowDownIcon}
            link={nextRank.current}
          >
            Next screenshot
          </ArrowButton>
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

const ScreenshotAlert = (props) => (
  <Alert color="info" py={8} textAlign="center" {...props} />
);
const AlertIcon = (props) => <x.svg w={16} mb={5} mx="auto" {...props} />;
const AlertTitle = (props) => <x.div fontWeight="semibold" mb={2} {...props} />;
const AlertBody = (props) => <x.div fontSize="sm" {...props} />;

const Screenshot = ({ screenshot, ...props }) => {
  const { name, url } = screenshot || {};
  if (!url) return null;
  return (
    <x.img src={url} name={name} mx="auto" objectFit="contain" {...props} />
  );
};

const Baseline = ({ activeDiff, containedScreenshots }) => {
  if (activeDiff.status === "added") {
    return (
      <div>
        <ScreenshotAlert>
          <AlertIcon as={PhotoIcon} />
          <AlertTitle>New screenshot</AlertTitle>
          <AlertBody>
            Nothing to compare yet. The baseline build does not contain a
            screenshot with this name.
          </AlertBody>
        </ScreenshotAlert>
      </div>
    );
  }

  if (activeDiff.status === "failed") {
    return (
      <div>
        <ScreenshotAlert>
          <AlertIcon as={XMarkIcon} />
          <AlertTitle>Failure screenshot</AlertTitle>
          <AlertBody>
            <x.div>
              Nothing to compare yet. The baseline build does not contain a
              screenshot with this name.
            </x.div>
            <x.div mt={4} fontSize="xs">
              Failure screenshots are automatically captured when a test fail
              and their filepath end by "failed".
            </x.div>
          </AlertBody>
        </ScreenshotAlert>
      </div>
    );
  }

  return (
    <ScreenshotsLink href={activeDiff.baseScreenshot?.url}>
      <Screenshot
        screenshot={activeDiff}
        maxH={containedScreenshots ? 1 : "unset"}
        opacity={0}
      />
      <Screenshot
        screenshot={activeDiff.baseScreenshot}
        position={activeDiff.url ? "absolute" : "static"}
        top={0}
      />
    </ScreenshotsLink>
  );
};

const ScreenshotsLink = (props) => (
  <BaseLink
    target="_blank"
    position="relative"
    display="inline-block" // fix Firefox bug on "position: relative"
    mx="auto"
    {...props}
  />
);

const Changes = ({ activeDiff, showChanges, containedScreenshots }) => {
  if (activeDiff.status === "stable") {
    return (
      <div>
        <ScreenshotAlert>
          <AlertIcon as={DocumentCheckIcon} />
          <AlertTitle>Stable Screenshot</AlertTitle>
          <AlertBody>No visual changes</AlertBody>
        </ScreenshotAlert>
      </div>
    );
  }

  if (activeDiff.status === "removed") {
    return (
      <div>
        <ScreenshotAlert>
          <AlertIcon as={ArchiveBoxXMarkIcon} />
          <AlertTitle>Screenshot deletion</AlertTitle>
          <AlertBody>
            Nothing to compare. The new build does not contain a screenshot with
            this name.
          </AlertBody>
        </ScreenshotAlert>
      </div>
    );
  }

  return (
    <ScreenshotsLink href={activeDiff.compareScreenshot?.url}>
      <Screenshot
        screenshot={activeDiff}
        maxH={containedScreenshots ? 1 : "unset"}
        opacity={0}
      />
      <Screenshot
        screenshot={activeDiff.compareScreenshot}
        position={activeDiff.url ? "absolute" : "static"}
        top="0"
      />
      <Screenshot
        screenshot={activeDiff}
        position="absolute"
        top="0"
        opacity={showChanges ? 1 : 0}
        backgroundColor="rgba(255, 255, 255, 0.8)"
      />
    </ScreenshotsLink>
  );
};

export function BuildDiff({
  baseScreenshotBucket,
  compareScreenshotBucket,
  activeDiff,
  previousRank,
  nextRank,
  showChanges,
  setShowChanges,
  buildUrl,
  containedScreenshots,
}) {
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
        buildUrl={buildUrl}
      />

      <x.div
        h={`calc(100vh - ${headerRect?.top + headerRect?.height || 0}px)`}
        overflowY="auto"
        pt={2}
        pb={8}
        px={4}
        display="grid"
        gridTemplateRows={`min-content ${
          containedScreenshots ? "minmax(0, 1fr)" : "auto"
        }`}
        gridTemplateColumns={2}
        gap={6}
        color="secondary-text"
        textAlign="center"
      >
        <BranchInfo bucket={baseScreenshotBucket} baseline />
        <BranchInfo bucket={compareScreenshotBucket} />
        <Baseline
          activeDiff={activeDiff}
          containedScreenshots={containedScreenshots}
        />
        <Changes
          activeDiff={activeDiff}
          showChanges={showChanges}
          compareScreenshotBucket={compareScreenshotBucket}
          containedScreenshots={containedScreenshots}
        />
      </x.div>
    </x.div>
  );
}
