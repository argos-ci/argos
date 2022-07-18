import { x } from '@xstyled/styled-components'
import { motion, useAnimation } from 'framer-motion'
import { forwardRef, useRef, useState } from 'react'
import {
  ArgosApproveButton,
  ArgosCard,
  ArgosCardBody,
  ArgosCardHeader,
  ArgosCardTitle,
} from '../Argos'
import { Browser } from '../Browser'
import { Mouse, MouseClick } from '../Mouse'
import { MouseInitializer, useMouse } from '../MouseContext'
import {
  Screenshot,
  ScreenshotContainer,
  ScreenshotDiff,
  ScreenshotLegend,
  ScreenshotThumb,
} from '../Screenshot'
import {
  CodeEditor,
  CodeEditorBody,
  CodeEditorCloseTabIcon,
  CodeEditorEditingTabIcon,
  CodeEditorHeader,
  CodeEditorTab,
  useTyping,
} from '../CodeEditor'
import { GithubMergeStatus } from '@components/Github'
import { IoGitBranch } from 'react-icons/io5'
import { TextIcon } from '@components/TextIcon'

const CODE_BUG = `.priceTag {
  background: #7e22ce;
  height: 13px;
}`

const CODE_FIX = `.priceTag {
  background: #7e22ce;
}`

function delay(ms) {
  // eslint-disable-next-line no-undef
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const Laser = (props) => (
  <x.div
    as={motion.div}
    minH={2}
    minW={1}
    position="absolute"
    backgroundImage="gradient-to-b"
    gradientFrom="gray-500-a10"
    gradientVia="white"
    gradientTo="gray-500-a10"
    initial={{ opacity: 0 }}
    variants={{
      show: { opacity: 1 },
      scan: { top: '100%', transition: { duration: 2 } },
      hide: { opacity: 0 },
      reset: { opacity: 0, top: 0 },
    }}
    {...props}
  />
)

const Canvas = forwardRef((props, ref) => {
  const { moveToRef, mouseAnimation, mouseClickAnimation } = useMouse()

  const githubAnimation = useAnimation()
  const browserAnimation = useAnimation()
  const codeEditorAnimation = useAnimation()
  const laserAnimation = useAnimation()
  const thumbAnimation = useAnimation()

  const codeEditorRef = useRef()
  const githubButtonRef = useRef()
  const closeBrowserButtonRef = useRef()
  const argosApproveButtonRef = useRef()

  const diffScreenshotAnimation = useAnimation()

  const [linesToTrim, setLinesToTrim] = useState()
  const [githubStatus, setGithubStatus] = useState('pending')
  const [approvedScreenshots, setApprovedScreenshots] = useState(false)
  const [showFixedScreenshots, setShowFixedScreenshots] = useState(false)

  const typedText = useTyping({
    text: CODE_BUG,
    linesToTrim,
    typingSpeed: 90,
    onSave: handleSaveCode,
  })
  const isTyping = typedText !== CODE_BUG && typedText !== CODE_FIX

  async function animateScreenshots() {
    await laserAnimation.start('show')
    await laserAnimation.start('scan')
    await laserAnimation.start('hide')
    await diffScreenshotAnimation.start('show')
    await thumbAnimation.start('show', { delay: 1.5, duration: 0.3 })
  }

  async function resetScreenshotAnimation() {
    await diffScreenshotAnimation.start('hide')
    await laserAnimation.start('reset')
    await thumbAnimation.start('hide')
  }

  async function failArgosAnimation() {
    await githubAnimation.start('show')
    await delay(2000)
    setGithubStatus('error')
    await moveToRef(githubButtonRef, { delay: 1 })
    await browserAnimation.start('show')
    await animateScreenshots()
    await moveToRef(closeBrowserButtonRef, { delay: 2 })
    await codeEditorAnimation.start('goForeground')
    await githubAnimation.start('goBackground')
    await browserAnimation.start('hide')
    await resetScreenshotAnimation()
    await moveToRef(codeEditorRef)
    await delay(1500)
    setLinesToTrim([2])
  }

  async function successArgosAnimation() {
    setShowFixedScreenshots(true)
    await browserAnimation.start('show')
    await animateScreenshots()
    await thumbAnimation.start('show', { delay: 1, duration: 0.3 })
    await moveToRef(argosApproveButtonRef, { delay: 1 })
    setApprovedScreenshots(true)
    setGithubStatus('success')
    await codeEditorAnimation.start('hide')
    await browserAnimation.start('goBackground', { delay: 1 })
    await githubAnimation.start('goForeground')
  }

  function handleSaveCode(savedCode) {
    if (savedCode === CODE_BUG) return failArgosAnimation()
    if (savedCode === CODE_FIX) return successArgosAnimation()
  }

  return (
    <x.div
      position="relative"
      zIndex={100}
      w="560px"
      maxW={1}
      ref={ref}
      {...props}
    >
      <Browser
        position="absolute"
        w="560px"
        maxW={1}
        initial={{ opacity: 0 }}
        as={motion.div}
        animate={browserAnimation}
        closeButtonRef={closeBrowserButtonRef}
        variants={{
          show: { opacity: 1, transition: { duration: 0.8 } },
          hide: { opacity: 0, transition: { duration: 0.6 } },
          goBackground: {
            zIndex: -1,
            opacity: 0.9,
            transition: { duration: 0.6 },
          },
        }}
      >
        <ArgosCard
          borderColor={approvedScreenshots ? 'success' : 'warning'}
          color="white"
          transition="opacity 1200ms 700ms"
          position="relative"
        >
          <ArgosCardHeader>
            <ArgosCardTitle>Car details page</ArgosCardTitle>
            <ArgosApproveButton
              ref={argosApproveButtonRef}
              variant={approvedScreenshots ? 'success' : 'warning'}
            />
          </ArgosCardHeader>
          <ArgosCardBody>
            <ScreenshotContainer>
              <x.div display="flex" flexDirection="column" position="relative">
                <Laser animate={laserAnimation} />
                <Screenshot tagColor="blue-500" />
              </x.div>
              <ScreenshotLegend>
                <TextIcon icon={IoGitBranch} my={0} iconStyle={{ mr: 1 }}>
                  main
                </TextIcon>
              </ScreenshotLegend>
            </ScreenshotContainer>

            <ScreenshotContainer>
              <x.div display="flex" flexDirection="column" position="relative">
                <Laser animate={laserAnimation} />
                <Screenshot
                  tagColor="primary-a80"
                  tagSize={showFixedScreenshots ? 'md' : 'sm'}
                />
              </x.div>
              <ScreenshotLegend>
                <TextIcon icon={IoGitBranch} my={0} iconStyle={{ mr: 1 }}>
                  rework
                </TextIcon>
              </ScreenshotLegend>
            </ScreenshotContainer>

            <ScreenshotContainer
              as={motion.div}
              animate={diffScreenshotAnimation}
              initial={{ opacity: 0 }}
              transform
              variants={{
                show: { opacity: 1, transition: { delay: 0.2, duration: 0.3 } },
                hide: { opacity: 0 },
              }}
            >
              <ScreenshotDiff
                variant={showFixedScreenshots ? 'fixed' : 'bugged'}
              />
              <ScreenshotThumb
                as={motion.div}
                initial={{ opacity: 0 }}
                variants={{
                  show: { opacity: 1 },
                  hide: { opacity: 0 },
                }}
                animate={thumbAnimation}
                success={showFixedScreenshots}
              />
              <ScreenshotLegend>argos diff</ScreenshotLegend>
            </ScreenshotContainer>
          </ArgosCardBody>
        </ArgosCard>
      </Browser>

      <x.div maxW={1} mr="40px" ref={codeEditorRef}>
        <CodeEditor
          w="450px"
          maxW={1}
          as={motion.div}
          animate={codeEditorAnimation}
          initial={{ zIndex: -1 }}
          variants={{
            goForeground: { zIndex: 1 },
            hide: { opacity: 0 },
          }}
        >
          <CodeEditorHeader>
            <CodeEditorTab active={isTyping}>
              style.css
              {isTyping ? (
                <CodeEditorEditingTabIcon />
              ) : (
                <CodeEditorCloseTabIcon />
              )}
            </CodeEditorTab>
          </CodeEditorHeader>
          <CodeEditorBody>{typedText}</CodeEditorBody>
        </CodeEditor>
      </x.div>

      <x.div
        maxW={1}
        ml="min(50px, 10%)"
        mt="-30px"
        mr="10px"
        as={motion.div}
        animate={githubAnimation}
        initial={{ opacity: 0 }}
        variants={{
          show: { opacity: 1 },
          goBackground: { zIndex: -2, opacity: 0.6 },
          goForeground: { zIndex: 200, opacity: 1 },
        }}
      >
        <GithubMergeStatus
          status={githubStatus}
          setStatus={setGithubStatus}
          detailsButtonRef={githubButtonRef}
          w="500px"
          maxW={1}
        />
      </x.div>

      <Mouse animate={mouseAnimation} initial={{ left: 120, top: 160 }}>
        <MouseClick animate={mouseClickAnimation} />
      </Mouse>
    </x.div>
  )
})

export const Animation = (props) => {
  const mouseAnimation = useAnimation()
  const mouseClickAnimation = useAnimation()
  const canvasRef = useRef()

  return (
    <MouseInitializer
      parentRef={canvasRef}
      mouseAnimation={mouseAnimation}
      mouseClickAnimation={mouseClickAnimation}
    >
      <Canvas ref={canvasRef} {...props} />
    </MouseInitializer>
  )
}
