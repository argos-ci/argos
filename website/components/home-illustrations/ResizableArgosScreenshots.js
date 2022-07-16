import { x } from '@xstyled/styled-components'
import { useState } from 'react'
import {
  IoDesktopOutline,
  IoLaptopOutline,
  IoLogoChrome,
  IoLogoEdge,
  IoLogoFirefox,
  IoPhonePortraitOutline,
  IoTabletLandscapeOutline,
  IoTabletPortraitOutline,
} from 'react-icons/io5'

import { ArgosCard } from '../Argos'
import { Screenshot, ScreenshotDiff } from '../Screenshot'

const ButtonIcon = (props) => (
  <x.div w="auto" h="34px" position="absolute" top={0} {...props} />
)

const BrowserIcon = (props) => (
  <x.div position="absolute" top="14px" w="12px" {...props} />
)

const ScreenButton = ({ active, value, onClick, ...props }) => (
  <x.div
    onClick={() => onClick(value)}
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="flex-end"
    textAlign="center"
    gap={3}
    position="relative"
    // minW="120px"
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

export const ResizableArgosScreenshots = (props) => {
  const [width, setWidth] = useState(190)

  return (
    <x.div w={1} {...props}>
      <x.div overflowX="auto" pb={1} ml={-2}>
        <x.div mt={2} display="flex" gap={6} alignItems="center">
          <ScreenButton value={140} active={width === 140} onClick={setWidth}>
            <ButtonIcon as={IoPhonePortraitOutline} mt="8px" />
            <x.div>Mobile</x.div>
          </ScreenButton>

          <ScreenButton value={180} active={width === 180} onClick={setWidth}>
            <ButtonIcon as={IoTabletPortraitOutline} mt="8px" />
            <BrowserIcon as={IoLogoEdge} />
            <x.div>Tablet</x.div>
          </ScreenButton>

          <ScreenButton value={190} active={width === 190} onClick={setWidth}>
            <ButtonIcon as={IoTabletLandscapeOutline} mt="4px" />
            <x.div>Landscape tablet</x.div>
          </ScreenButton>

          <ScreenButton value={200} active={width === 200} onClick={setWidth}>
            <ButtonIcon as={IoLaptopOutline} h="50px" />
            <BrowserIcon as={IoLogoChrome} top="16px" />

            <x.div>Desktop</x.div>
          </ScreenButton>

          <ScreenButton value={260} active={width === 260} onClick={setWidth}>
            <ButtonIcon as={IoDesktopOutline} h="43px" mt="4px" />
            <x.div>Wide screen</x.div>
            <BrowserIcon as={IoLogoFirefox} top="12px" />
          </ScreenButton>
        </x.div>
      </x.div>

      <x.div
        mt={3}
        display="flex"
        justifyContent={{ _: 'center', sm: 'flex-start' }}
        overflowX="auto"
      >
        <ArgosCard
          as="span"
          borderColor="success"
          display="inline-flex"
          px={{ _: '2', md: '4' }}
          py={2}
          gap={6}
          justifyContent="left"
          alignItems="center"
          flexDirection={{ _: 'column', sm: 'row' }}
          h="auto"
          w="auto"
        >
          <Screenshot tagColor="blue-500" w={width} />
          <Screenshot
            tagColor="primary-a80"
            tagSize="md"
            w={width}
            display={{ _: 'none', sm: 'block' }}
          />
          <ScreenshotDiff
            w={width}
            minH={1}
            display={{ _: 'none', sm: 'block' }}
          />
        </ArgosCard>
      </x.div>
    </x.div>
  )
}
