import { Browser } from "@components/Browser";
import { x } from "@xstyled/styled-components";
import { forwardRef, useRef, useState } from "react";
import {
  IoDesktopOutline,
  IoLaptopOutline,
  IoPhonePortraitOutline,
  IoTabletLandscapeOutline,
  IoTabletPortraitOutline,
} from "react-icons/io5";
import {
  ArgosCard,
  ArgosCardBody,
  ArgosCardHeader,
  ArgosCardTitle,
} from "../Argos";
import { Screenshot, ScreenshotDiff } from "../Screenshot";

const ResolutionButton = ({ active, label, icon: Icon, ...props }) => (
  <x.button
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="flex-end"
    textAlign="center"
    gap={3}
    position="relative"
    borderRadius="md"
    p={2}
    whiteSpace="nowrap"
    transition
    cursor="pointer"
    bg="transparent"
    color={
      active
        ? "white"
        : { _: "blue-gray-500", focus: "blue-gray-400", hover: "blue-gray-400" }
    }
    outline={{ focus: "none" }}
    {...props}
  >
    <Icon size={44} />
    <div>{label}</div>
  </x.button>
);

const ResolutionSelector = ({ resolution, onChange, ...props }) => (
  <x.div overflowX="auto" {...props}>
    <x.div mt={2} display="flex" gap={8} alignItems="center">
      <ResolutionButton
        active={resolution === 140}
        onClick={() => onChange(140)}
        icon={IoPhonePortraitOutline}
        label="Mobile"
      />

      <ResolutionButton
        active={resolution === 180}
        onClick={() => onChange(180)}
        icon={IoTabletPortraitOutline}
        label="Tablet"
      />

      <ResolutionButton
        active={resolution === 190}
        onClick={() => onChange(190)}
        icon={IoTabletLandscapeOutline}
        label="Landscape tablet"
      />

      <ResolutionButton
        active={resolution === 200}
        onClick={() => onChange(200)}
        icon={IoLaptopOutline}
        label="Desktop"
      />

      <ResolutionButton
        active={resolution === 260}
        onClick={() => onChange(260)}
        icon={IoDesktopOutline}
        label="Wide screen"
      />
    </x.div>
  </x.div>
);

const ArgosScreenshots = forwardRef(
  ({ screenshotWidth, title, ...props }, ref) => (
    <x.div ref={ref} {...props}>
      <ArgosCardHeader>
        <ArgosCardTitle>{title}</ArgosCardTitle>
      </ArgosCardHeader>
      <x.div overflowX="auto">
        <ArgosCardBody display="inline-flex">
          <Screenshot tagColor="blue-500" w={screenshotWidth} />
          <Screenshot tagColor="primary-a80" tagSize="md" w={screenshotWidth} />
          <ScreenshotDiff w={screenshotWidth} minH={1} />
        </ArgosCardBody>
      </x.div>
    </x.div>
  )
);

export const ResizableArgosScreenshots = (props) => {
  const [resolution, setResolution] = useState(140);

  const argosRef = useRef();
  const mobileScreenshotsRef = useRef();
  const tabletScreenshotsRef = useRef();
  const landscapeTabletScreenshotsRef = useRef();
  const desktopScreenshotsRef = useRef();
  const wideScreenScreenshotsRef = useRef();

  function scrollToScreenshots(screenshotsRef) {
    argosRef.current.scrollTo({
      top: screenshotsRef.current.offsetTop,
      behavior: "smooth",
    });
  }

  function getScreenshotsResolutionRef(resolution) {
    switch (resolution) {
      case 140:
        scrollToScreenshots(mobileScreenshotsRef);
        break;
      case 180:
        scrollToScreenshots(tabletScreenshotsRef);
        break;
      case 190:
        scrollToScreenshots(landscapeTabletScreenshotsRef);
        break;
      case 200:
        scrollToScreenshots(desktopScreenshotsRef);
        break;
      case 260:
        scrollToScreenshots(wideScreenScreenshotsRef);
      default:
        break;
    }
  }

  function handleChange(resolution) {
    getScreenshotsResolutionRef(resolution);
    setResolution(resolution);
  }

  return (
    <x.div {...props}>
      <ResolutionSelector
        resolution={resolution}
        onChange={handleChange}
        mb={6}
      />
      <Browser maxW="3xl">
        <ArgosCard
          borderColor="success"
          display="flex"
          flexDirection="column"
          overflowY="hidden"
          pt={1}
          pb={10}
          maxH={250}
          ref={argosRef}
        >
          <ArgosScreenshots
            title="Mobile resolution"
            screenshotWidth={140}
            ref={mobileScreenshotsRef}
          />
          <ArgosScreenshots
            title="Tablet resolution"
            screenshotWidth={180}
            ref={tabletScreenshotsRef}
          />
          <ArgosScreenshots
            title="Landscape Tablet resolution"
            screenshotWidth={190}
            ref={landscapeTabletScreenshotsRef}
          />
          <ArgosScreenshots
            title="Desktop resolution"
            screenshotWidth={200}
            ref={desktopScreenshotsRef}
          />
          <ArgosScreenshots
            title="Wide resolution"
            screenshotWidth={260}
            ref={wideScreenScreenshotsRef}
          />
        </ArgosCard>
      </Browser>
    </x.div>
  );
};
