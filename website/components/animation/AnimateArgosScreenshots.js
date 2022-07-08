import { motion, useAnimation } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { AnimateMouse } from './AnimateMouse'
import {
  ArgosApproveButton,
  ArgosCard,
  ArgosCardBody,
  ArgosCardHeader,
  ArgosCardTitle,
  Screenshots,
} from '@components/animation/Argos'
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
  const cardBodyRef = useRef()
  const screenshotsContainerRef = useRef()

  useEffect(() => {
    async function startAnimation() {
      if (visible) {
        console.log({ argosVisible: visible })
        await scrollAnimation.start({
          y:
            screenshotsContainerRef.current.clientHeight -
            cardBodyRef.current.clientHeight,
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
      borderColor={check ? 'success' : 'warning'}
      color="white"
      zIndex={100}
      transition="opacity 1200ms 700ms"
      position="relative"
      {...props}
    >
      <ArgosCardHeader>
        <ArgosCardTitle>Screenshots</ArgosCardTitle>
        <ArgosApproveButton variant={check ? 'success' : 'warning'} />
      </ArgosCardHeader>

      <ArgosCardBody overflowY="scroll" h={300} ref={cardBodyRef} pb={10}>
        <Screenshots
          as={motion.div}
          animate={scrollAnimation}
          ref={screenshotsContainerRef}
        >
          <DetailsScreenshot />
          <DetailsScreenshot variant />
          <DetailsScreenshotDiff />

          <MobileScreenshot />
          <MobileScreenshot variant={approve ? 'fixed' : 'bugged'} />
          <MobileScreenshotDiff variant={approve ? 'fixed' : 'bugged'} mb={4} />
        </Screenshots>
      </ArgosCardBody>

      {showMouse ? (
        <AnimateMouse
          from={{ right: 300, top: 130, opacity: 0 }}
          to={{ right: 70, top: 24, opacity: 1 }}
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
