import { useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { x } from '@xstyled/styled-components'
import { CodeEditor } from '@components/animation/CodeEditor'
import { Browser } from '@components/animation/Browser'
import { AnimateGithubStatus } from '@components/animation/AnimateGithubStatus'
import { AnimateArgosScreenshots } from '@components/animation/AnimateArgosScreenshots'
import { Mouse, MouseClick } from './AnimateMouse'

const CODE_BUG = `.priceTag {
  background: #7e22ce;
  height: 13px;
}`

const CODE_FIX = `.priceTag {
  background: #7e22ce;
}`

function getAbsolutePosition(
  parentRef,
  targetRef,
  { scale, leftOffset = 0, topOffset = 0 },
) {
  if (!parentRef.current || !targetRef.current) return { x: 0, y: 0 }
  const targetCoordinates = targetRef.current.getBoundingClientRect()
  const parentCoordinates = parentRef.current.getBoundingClientRect()

  return {
    left:
      (targetCoordinates.left +
        targetCoordinates.width / 2 -
        parentCoordinates.left +
        leftOffset) /
      scale,
    top:
      (targetCoordinates.top +
        targetCoordinates.height / 2 -
        parentCoordinates.top +
        topOffset) /
      scale,
  }
}

export function Animation({ ...props }) {
  const codeEditorAnimation = useAnimation()
  const githubAnimation = useAnimation()
  const browserAnimation = useAnimation()
  const mouseAnimation = useAnimation()
  const mouseClickAnimation = useAnimation()
  const argosScrollAnimation = useAnimation()

  const [editorCode, setCode] = useState(CODE_BUG)
  const [savedCode, setSavedCode] = useState()
  const [githubStatus, setGithubStatus] = useState('pending')

  const ref = useRef()
  const codeEditorButtonRef = useRef()
  const githubButtonRef = useRef()
  const closeBrowserButtonRef = useRef()
  const argosApproveButtonRef = useRef()

  async function moveMouse(to, { delay = 0.3, velocity = 1.2 } = {}) {
    await mouseAnimation.start({
      opacity: 1,
      transition: { delay, duration: 0.2 },
    })
    await mouseAnimation.start({ ...to, transition: { duration: velocity } })
    await mouseClickAnimation.start({
      opacity: 1,
      transition: { delay: 0.3, duration: 0.3 },
    })
    await mouseAnimation.start({ opacity: 0.4, duration: 0.3 })
    await mouseClickAnimation.start({ opacity: 0, delay: 0.3, duration: 0.3 })
  }
  async function moveMouseTo(targetRef, options = {}) {
    const { leftOffset, topOffset, ...moveOptions } = options
    const targetPosition = getAbsolutePosition(ref, targetRef, {
      scale: props.scale,
      leftOffset,
      topOffset,
    })
    return moveMouse(targetPosition, moveOptions)
  }

  async function handleSaveCode(typedCode) {
    console.log('handleSaveCode')

    // Sequence : code editor 1
    await moveMouseTo(codeEditorButtonRef)
    setSavedCode(typedCode)
    codeEditorAnimation.start('hide')

    // Sequence : Github
    githubAnimation.start('show', { delay: 0.3, duration: 1 })
    await moveMouseTo(githubButtonRef, {
      leftOffset: -90,
      topOffset: -65,
      delay: 0,
    })
    await moveMouseTo(githubButtonRef, { delay: 1 })

    // Sequence : Argos
    githubAnimation.start('hide')
    await browserAnimation.start('show')
    argosScrollAnimation.start('scrollBottom', {
      delay: 1.5,
      duration: 1,
    })

    return typedCode === CODE_BUG
      ? failArgosAnimation()
      : successArgosAnimation()
  }

  async function failArgosAnimation() {
    console.log('failArgosAnimation')
    await moveMouseTo(githubButtonRef, {
      topOffset: 130,
      delay: 1.5,
    })
    await moveMouseTo(closeBrowserButtonRef, { delay: 1 })

    // Sequence : code editor
    browserAnimation.start('hide')
    codeEditorAnimation.start('show', { duration: 0.6 })
    await moveMouseTo(codeEditorButtonRef, {
      delay: 0,
      leftOffset: -40,
      topOffset: 160,
    })
    setTimeout(() => setCode(CODE_FIX), 800)
  }

  async function successArgosAnimation() {
    console.log('successArgosAnimation')
    await moveMouseTo(argosApproveButtonRef, { delay: 1 })

    // Sequence Github
    setGithubStatus('success')
    githubAnimation.start('shrink', { duration: 0.3 })
  }

  return (
    <x.div
      position="relative"
      border={1}
      borderColor="green"
      m={0}
      ref={ref}
      {...props}
    >
      <CodeEditor
        delayTyping={500}
        w="300px"
        zIndex="100"
        as={motion.div}
        initial={{ y: '160px', x: '220px' }}
        variants={{
          hide: { opacity: 0.3, zIndex: -1 },
          show: { opacity: 1, zIndex: 100 },
        }}
        animate={codeEditorAnimation}
        callback={handleSaveCode}
        saveButtonRef={codeEditorButtonRef}
      >
        {editorCode}
      </CodeEditor>

      <AnimateGithubStatus
        status={githubStatus}
        setStatus={setGithubStatus}
        animate={githubAnimation}
        initial={{ y: '45px', x: '5px', opacity: 0.6 }}
        savedCode={savedCode}
        variants={{
          hide: { opacity: 0.6, zIndex: -1 },
          show: { opacity: 1 },
          shrink: { zIndex: 2000, opacity: 1, width: 380 },
        }}
        detailsButtonRef={githubButtonRef}
      />

      <Browser
        initial={{ opacity: 0 }}
        as={motion.div}
        animate={browserAnimation}
        closeButtonRef={closeBrowserButtonRef}
        variants={{
          show: { opacity: 1, transition: { duration: 0.8 } },
          hide: { opacity: 0, transition: { duration: 0.6 } },
        }}
      >
        <AnimateArgosScreenshots
          approve={savedCode === CODE_FIX}
          scrollAnimation={argosScrollAnimation}
          approveButtonRef={argosApproveButtonRef}
          approved={githubStatus === 'success'}
        />
      </Browser>

      <Mouse animate={mouseAnimation} initial={{ left: 280, top: 340 }}>
        <MouseClick animate={mouseClickAnimation} />
      </Mouse>
    </x.div>
  )
}
