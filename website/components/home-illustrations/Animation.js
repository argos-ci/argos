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
import { FakeScreenshotDiff, Screenshot, ScreenshotDiff } from '../Screenshot'
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

const Canvas = forwardRef((props, ref) => {
  const { moveToRef, mouseAnimation, mouseClickAnimation } = useMouse()

  const githubAnimation = useAnimation()
  const browserAnimation = useAnimation()
  const codeEditorAnimation = useAnimation()

  const codeEditorRef = useRef()
  const githubButtonRef = useRef()
  const closeBrowserButtonRef = useRef()
  const argosApproveButtonRef = useRef()

  const beforeScreenshotAnimation = useAnimation()
  const afterScreenshotAnimation = useAnimation()
  const diffScreenshotAnimation = useAnimation()
  const fakeDiffScreenshotAnimation = useAnimation()

  const [linesToTrim, setLinesToTrim] = useState()
  const [githubStatus, setGithubStatus] = useState('pending')
  const [approvedScreenshots, setApprovedScreenshots] = useState(false)
  const [showFixedScreenshots, setShowFixedScreenshots] = useState(false)

  const typedText = useTyping({
    text: CODE_BUG,
    linesToTrim,
    // typingSpeed: 90,
    typingSpeed: 30,
    onSave: handleSaveCode,
  })
  const isTyping = typedText !== CODE_BUG && typedText !== CODE_FIX

  async function animateScreenshots() {
    await beforeScreenshotAnimation.start('hide', { delay: 1, duration: 1 })
    await afterScreenshotAnimation.start('hide', { delay: 1, duration: 1 })

    await beforeScreenshotAnimation.start('goBackground')
    await beforeScreenshotAnimation.start('show')
    await afterScreenshotAnimation.start('goBackground')
    await afterScreenshotAnimation.start('show')

    await fakeDiffScreenshotAnimation.start('hide', { delay: 1, duration: 1 })
    await diffScreenshotAnimation.start('move', { delay: 1, duration: 0.8 })
    await beforeScreenshotAnimation.start('move', { duration: 0.8 })
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
    await moveToRef(codeEditorRef)
    await delay(1500)
    setLinesToTrim([2])
  }

  async function successArgosAnimation() {
    setShowFixedScreenshots(true)
    await browserAnimation.start('show')
    await moveToRef(argosApproveButtonRef, { delay: 1 })
    setApprovedScreenshots(true)
    setGithubStatus('success')
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
            <Screenshot
              tagColor="blue-500"
              as={motion.div}
              animate={beforeScreenshotAnimation}
              transform
              translateX={{ _: 'calc(100% + 8px)', sm: 'calc(100% + 16px)' }}
              zIndex={130}
              variants={{
                hide: { opacity: 0 },
                move: { translateX: 0 },
                goBackground: { zIndex: 90 },
                show: { opacity: 1 },
              }}
            />

            <Screenshot
              tagColor="primary-a80"
              tagSize={showFixedScreenshots ? 'md' : 'sm'}
              as={motion.div}
              animate={afterScreenshotAnimation}
              initial={{ zIndex: 120 }}
              variants={{
                hide: { opacity: 0 },
                goBackground: { zIndex: 80 },
                show: { opacity: 1 },
              }}
            />

            <ScreenshotDiff
              variant={showFixedScreenshots ? 'fixed' : 'bugged'}
              as={motion.div}
              animate={diffScreenshotAnimation}
              transform
              translateX={{ _: 'calc(-100% - 8px)', sm: 'calc(-100% - 16px)' }}
              zIndex={100}
              variants={{ move: { translateX: 0 } }}
            />

            <FakeScreenshotDiff
              as={motion.div}
              animate={fakeDiffScreenshotAnimation}
              mx="auto"
              left={0}
              right={0}
              zIndex={110}
              position="absolute"
              w={{ _: 'calc(100% / 3 - 8px)', sm: 'calc(100% / 3 - 16px)' }}
              h="calc(100% - 16px)"
              variants={{ hide: { display: 'none' } }}
            />
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
          variants={{ goForeground: { zIndex: 1 } }}
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
