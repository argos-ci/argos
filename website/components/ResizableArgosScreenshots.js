import { x } from '@xstyled/styled-components'
import { useState } from 'react'
import { ArgosCard } from './animation/Argos'
import { Screenshot, ScreenshotDiff } from './animation/Screenshot'

export const ResizableArgosScreenshots = (props) => {
  const [width, setWidth] = useState(180)

  return (
    <x.div mt={8}>
      <x.div>
        <x.label for="width" fontSize="xl">
          Screenshots resolution
        </x.label>
        <x.div>
          <x.div mt={2} display="flex" gap={4}>
            <x.div>Mobile</x.div>
            <x.input
              type="range"
              onChange={(event) => setWidth(event.target.value)}
              min={140}
              max={280}
              w="450px"
              step={20}
            />
            <x.div>Wide screen</x.div>
          </x.div>
        </x.div>
      </x.div>

      <ArgosCard
        borderColor="success"
        transition="opacity 1200ms 700ms"
        w={1}
        maxW="900px"
        display="flex"
        px={{ _: '2', md: '4' }}
        pt={1}
        pb={5}
        gap={4}
        justifyContent="space-between"
        alignItems="center"
        flexDirection={{ _: 'column', sm: 'row' }}
        h="auto"
        mt={3}
        {...props}
      >
        <Screenshot
          tagColor="blue-500"
          position="relative"
          left={0}
          transform
          translateX={0}
          w={width}
          maxW={width}
          minH="170px"
        />
        <Screenshot
          tagColor="primary-a80"
          tagSize="md"
          position="relative"
          left={0}
          transform
          translateX={0}
          w={width}
          maxW={width}
          minH="170px"
        />

        <ScreenshotDiff
          position="relative"
          left={0}
          transform
          translateX={0}
          w={width}
          maxW={width}
          minH="170px"
        />
      </ArgosCard>
    </x.div>
  )
}
