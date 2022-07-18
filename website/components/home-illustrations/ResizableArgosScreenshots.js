import { Browser } from '@components/Browser'
import { x } from '@xstyled/styled-components'
import { forwardRef, useRef, useState } from 'react'
import {
  IoDesktopOutline,
  IoLaptopOutline,
  IoPhonePortraitOutline,
  IoTabletLandscapeOutline,
  IoTabletPortraitOutline,
} from 'react-icons/io5'
import {
  ArgosCard,
  ArgosCardBody,
  ArgosCardHeader,
  ArgosCardTitle,
} from '../Argos'
import { Screenshot, ScreenshotDiff } from '../Screenshot'

const ButtonIcon = (props) => (
  <x.div w="auto" h="34px" position="absolute" top={0} {...props} />
)

const ResolutionButton = ({ active, value, onClick, ...props }) => (
  <x.div
    onClick={() => onClick(value)}
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="flex-end"
    textAlign="center"
    gap={3}
    position="relative"
    borderRadius="md"
    h="80px"
    p={2}
    whiteSpace="nowrap"
    color={active ? 'white' : 'secondary'}
    transition="300ms"
    cursor="pointer"
    {...props}
  />
)

const ResolutionSelector = ({ resolution, onChange, ...props }) => (
  <x.div overflowX="auto" pb={1} ml={-2} {...props}>
    <x.div mt={2} display="flex" gap={6} alignItems="center">
      <ResolutionButton
        value={140}
        active={resolution === 140}
        onClick={onChange}
      >
        <ButtonIcon as={IoPhonePortraitOutline} mt="8px" />
        <x.div>Mobile</x.div>
      </ResolutionButton>

      <ResolutionButton
        value={180}
        active={resolution === 180}
        onClick={onChange}
      >
        <ButtonIcon as={IoTabletPortraitOutline} mt="8px" />
        <x.div>Tablet</x.div>
      </ResolutionButton>

      <ResolutionButton
        value={190}
        active={resolution === 190}
        onClick={onChange}
      >
        <ButtonIcon as={IoTabletLandscapeOutline} mt="4px" />
        <x.div>Landscape tablet</x.div>
      </ResolutionButton>

      <ResolutionButton
        value={200}
        active={resolution === 200}
        onClick={onChange}
      >
        <ButtonIcon as={IoLaptopOutline} h="50px" />
        <x.div>Desktop</x.div>
      </ResolutionButton>

      <ResolutionButton
        value={260}
        active={resolution === 260}
        onClick={onChange}
      >
        <ButtonIcon as={IoDesktopOutline} h="43px" mt="4px" />
        <x.div>Wide screen</x.div>
      </ResolutionButton>
    </x.div>
  </x.div>
)

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
  ),
)

export const ResizableArgosScreenshots = (props) => {
  const [resolution, setResolution] = useState(140)

  const argosRef = useRef()
  const mobileScreenshotsRef = useRef()
  const tabletScreenshotsRef = useRef()
  const landscapeTabletScreenshotsRef = useRef()
  const desktopScreenshotsRef = useRef()
  const wideScreenScreenshotsRef = useRef()

  function scrollToScreenshots(screenshotsRef) {
    argosRef.current.scrollTo({
      top: screenshotsRef.current.offsetTop,
      behavior: 'smooth',
    })
  }

  function getScreenshotsResolutionRef(resolution) {
    switch (resolution) {
      case 140:
        scrollToScreenshots(mobileScreenshotsRef)
        break
      case 180:
        scrollToScreenshots(tabletScreenshotsRef)
        break
      case 190:
        scrollToScreenshots(landscapeTabletScreenshotsRef)
        break
      case 200:
        scrollToScreenshots(desktopScreenshotsRef)
        break
      case 260:
        scrollToScreenshots(wideScreenScreenshotsRef)
      default:
        break
    }
  }

  function handleChange(resolution) {
    getScreenshotsResolutionRef(resolution)
    setResolution(resolution)
  }

  return (
    <x.div {...props}>
      <ResolutionSelector
        resolution={resolution}
        onChange={handleChange}
        mb={3}
      />
      <Browser maxW="850">
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
  )
}
