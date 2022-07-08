import { x } from '@xstyled/styled-components'
import { motion, useAnimation } from 'framer-motion'
import { useEffect, useState } from 'react'
import { IoCheckmark } from 'react-icons/io5'
import { AnimateMouse } from './AnimateMouse'
import {
  ArgosButton,
  ArgosCard,
  ArgosCardBody,
  ArgosCardHeader,
  ArgosCardTitle,
} from './ArgosScreenshots'
import {
  DetailsScreenshot,
  DetailsScreenshotDiff,
  MobileScreenshot,
  MobileScreenshotDiff,
} from './Screenshot'

export const AnimateArgosScreenshots = ({
  approve,
  callback,
  mouseMoveDelay,
  visible,
  ...props
}) => {
  const [check, setCheck] = useState(false)
  const [showMouse, setShowMouse] = useState(false)
  const scrollAnimation = useAnimation()

  useEffect(() => {
    async function startAnimation() {
      if (visible) {
        console.log({ argosVisible: visible })
        await scrollAnimation.start({
          y: '-50px',
          transition: { delay: 2, duration: 1.2 },
        })
        if (approve) setShowMouse(true)
      } else {
        scrollAnimation.start({ y: '0' })
      }
    }
    startAnimation()
  }, [approve, scrollAnimation, visible])

  return (
    <ArgosCard
      borderColor="#ffc107"
      color="white"
      zIndex={100}
      transition="opacity 1200ms 700ms"
      position="relative"
      {...props}
    >
      <ArgosCardHeader>
        <ArgosCardTitle>Screenshots</ArgosCardTitle>
        <ArgosButton mr="8px" color="white" bg={check ? 'success' : 'warning'}>
          {check ? (
            <>
              <x.div as={IoCheckmark} />
              Approved
            </>
          ) : (
            'Mark as approved'
          )}
        </ArgosButton>
      </ArgosCardHeader>
      <ArgosCardBody overflowY="scroll" h={300}>
        <x.div as={motion.div} animate={scrollAnimation} h={1}>
          <x.div display="flex" gap="10px" my={4}>
            <DetailsScreenshot />
            <DetailsScreenshot variant />
            <DetailsScreenshotDiff />
          </x.div>

          <x.div display="flex" gap="10px">
            <MobileScreenshot />
            <MobileScreenshot variant={approve ? 'fixed' : 'bugged'} />
            <MobileScreenshotDiff variant={approve ? 'fixed' : 'bugged'} />
          </x.div>
        </x.div>
      </ArgosCardBody>

      {showMouse ? (
        <AnimateMouse
          from={{ right: 300, top: 130, opacity: 0 }}
          to={{ right: 70, top: 20, opacity: 1 }}
          delay={mouseMoveDelay}
          callback={() => {
            setCheck(true)
            callback()
          }}
        />
      ) : null}
    </ArgosCard>
  )
}
