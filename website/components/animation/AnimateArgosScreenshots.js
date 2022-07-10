import { motion } from 'framer-motion'
import { useRef } from 'react'
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
  scrollAnimation,
  approveButtonRef,
  approved,
  h = 340,
  ...props
}) => {
  const screenshotsContainerRef = useRef()
  const headerRef = useRef()

  const bodyHeight = h - 43
  const scrollToBottom =
    bodyHeight - screenshotsContainerRef.current?.clientHeight - 50

  return (
    <ArgosCard
      borderColor={approved ? 'success' : 'warning'}
      color="white"
      zIndex={100}
      transition="opacity 1200ms 700ms"
      position="relative"
      {...props}
    >
      <ArgosCardHeader ref={headerRef}>
        <ArgosCardTitle>Screenshots</ArgosCardTitle>
        <ArgosApproveButton
          ref={approveButtonRef}
          variant={approved ? 'success' : 'warning'}
        />
      </ArgosCardHeader>

      <ArgosCardBody overflowY="hidden" h={bodyHeight} pb={10}>
        <Screenshots
          as={motion.div}
          animate={scrollAnimation}
          variants={{
            scrollTop: { y: 0 },
            scrollBottom: {
              y: scrollToBottom,
              transition: { delay: 1.5, duration: 1 },
            },
          }}
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
    </ArgosCard>
  )
}
