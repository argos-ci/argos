import { motion } from 'framer-motion'
import { useRef } from 'react'
import {
  ArgosApproveButton,
  ArgosCard,
  ArgosCardBody,
  ArgosCardHeader,
  ArgosCardTitle,
} from '@components/animation/Argos'
import { FakeScreenshotDiff, Screenshot, ScreenshotDiff } from './Screenshot'

export const AnimateArgosScreenshots = ({
  approve,
  approveButtonRef,
  approved,
  beforeScreenshotAnimation,
  afterScreenshotAnimation,
  diffScreenshotAnimation,
  fakeDiffScreenshotAnimation,
  ...props
}) => {
  const headerRef = useRef()

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
        <ArgosCardTitle>Car details page</ArgosCardTitle>
        <ArgosApproveButton
          ref={approveButtonRef}
          variant={approved ? 'success' : 'warning'}
        />
      </ArgosCardHeader>

      <ArgosCardBody>
        <ScreenshotDiff
          variant={approve ? 'fixed' : 'bugged'}
          animate={diffScreenshotAnimation}
          as={motion.div}
          variants={{ move: { left: '452px' } }}
        />

        <FakeScreenshotDiff
          animate={fakeDiffScreenshotAnimation}
          as={motion.div}
          variants={{ hide: { opacity: 0 } }}
        />

        <Screenshot
          variant={approve ? 'fixed' : 'bugged'}
          animate={afterScreenshotAnimation}
          as={motion.div}
          variants={{
            hide: { opacity: 0 },
            goBackground: { zIndex: -2, opacity: 1 },
          }}
          tagColor="primary-a80"
          tagSize="sm"
          position="relative"
        />

        <Screenshot
          animate={beforeScreenshotAnimation}
          as={motion.div}
          initial={{ zIndex: 1 }}
          variants={{
            hide: { opacity: 0 },
            move: { left: '88px' },
            goUpfront: { zIndex: -1, opacity: 1 },
          }}
          tagColor="blue-500"
        />
      </ArgosCardBody>
    </ArgosCard>
  )
}
