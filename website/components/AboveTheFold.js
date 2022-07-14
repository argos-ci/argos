import { useEffect, useRef, useState } from 'react'
import { x } from '@xstyled/styled-components'
import { Subtitle, Title } from 'components/Titles'
import { Animation } from 'components/animation'
import { GradientText } from '@components/GradientText'
import { Button } from '@components/Button'

export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  })
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  return windowSize
}

export const AboveTheFold = (props) => {
  const [animationScale, setAnimationScale] = useState()
  const animationContainerRef = useRef()
  const { width: windowWidth } = useWindowSize()
  const animationDimensions = { width: 600, height: 410 }

  useEffect(() => {
    setAnimationScale(
      Math.min(
        1,
        animationContainerRef.current.clientWidth / animationDimensions.width,
      ),
    )
  }, [animationDimensions.width, windowWidth])

  return (
    <x.div
      display="flex"
      flexDirection={{ _: 'column', lg: 'row' }}
      justifyContent="space-between"
      alignItems="center"
      columnGap={2}
      rowGap={20}
    >
      <x.div
        flex={{ _: 1, lg: 1 / 2 }}
        alignItems={{ _: 'flex-start', sm: 'center', lg: 'flex-start' }}
        maxW={{ sm: '500px' }}
        display="flex"
        flexDirection="column"
        gap={8}
      >
        <Title {...props}>
          Screenshot Testing
          <GradientText as="div">catch visual bugs</GradientText>
        </Title>
        <Subtitle>
          Adds screenshot review to your developer team’s routine.{' '}
          <x.span color="secondary">
            Compare pull-requests screenshots and be notified when{' '}
            <x.span color="gray-200" top="-2px" position="relative">
              something*{' '}
            </x.span>
            changes.
          </x.span>
        </Subtitle>
        <Button
          w={{ _: 1, sm: 200, lg: 'auto' }}
          px={6}
          h={12}
          fontWeight="semibold"
        >
          Get started
        </Button>
      </x.div>
      <x.div
        display="flex"
        ref={animationContainerRef}
        minH={animationDimensions.height * animationScale}
        justifyContent="center"
        alignItems="flex-start"
        overflow="hidden"
        flex={{ lg: 1 / 2 }}
        w={1}
      >
        {animationScale ? (
          <Animation transform transformOrigin="top" scale={animationScale} />
        ) : null}
      </x.div>
    </x.div>
  )
}
