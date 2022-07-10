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

function getAbsolutePosition({
  parentRef,
  targetRef,
  options: { leftOffset = 0, topOffset = 0, scale } = {},
}) {
  if (!parentRef.current || !targetRef.current) return { x: 0, y: 0 }
  const target = targetRef.current.getBoundingClientRect()
  const parent = parentRef.current.getBoundingClientRect()
  return {
    left: target.left - parent.left + target.width / 2 + leftOffset * scale,
    top: target.top - parent.top + target.height / 2 + topOffset * scale,
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

  async function moveMouse(
    { left, top, ...toOptions },
    { delay = 0.3, velocity = 1.2, scale = props.scale } = {},
  ) {
    const scaleLeft = left / scale
    const scaleTop = top / scale

    await mouseAnimation.start({
      opacity: 1,
      transition: { delay, duration: 0.2 },
    })

    await mouseAnimation.start({
      left: scaleLeft,
      top: scaleTop,
      ...toOptions,
      transition: { duration: velocity },
    })
    await mouseClickAnimation.start({
      opacity: 1,
      transition: { delay: 0.3, duration: 0.3 },
    })
    await mouseAnimation.start({ opacity: 0.4, duration: 0.3 })
    await mouseClickAnimation.start({ opacity: 0, delay: 0.3, duration: 0.3 })
  }
  async function moveMouseTo(targetRef, options = {}) {
    const { leftOffset, topOffset, ...moveOptions } = options
    const targetPosition = getAbsolutePosition({
      parentRef: ref,
      targetRef,
      options: { leftOffset, topOffset, scale: props.scale },
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
    githubAnimation.start('show')
    await moveMouseTo(githubButtonRef, { delay: 3 })

    // Sequence : Argos
    githubAnimation.start('hide')
    await browserAnimation.start('show')

    return typedCode === CODE_BUG
      ? failArgosAnimation()
      : successArgosAnimation()
  }

  async function failArgosAnimation() {
    console.log('failArgosAnimation')
    await argosScrollAnimation.start('scrollBottom')
    await moveMouseTo(closeBrowserButtonRef, { delay: 2 })

    // Sequence : code editor
    browserAnimation.start('hide')
    codeEditorAnimation.start('show')
    await moveMouseTo(codeEditorButtonRef, { delay: 0, leftOffset: -60 })
    setTimeout(() => setCode(CODE_FIX), 800)
  }

  async function successArgosAnimation() {
    console.log('successArgosAnimation')
    await githubAnimation.start('shrink')
    await moveMouseTo(argosApproveButtonRef, { delay: 1 })

    // Sequence Github
    setGithubStatus('success')
    await githubAnimation.start('showUp')
  }

  return (
    <x.div position="relative" m={0} ref={ref} {...props}>
      <CodeEditor
        delayTyping={500}
        w="300px"
        zIndex="100"
        as={motion.div}
        // initial={{ y: '160px', x: '220px' }}
        initial={{ y: '10px', x: '25px' }}
        variants={{
          show: { opacity: 1, zIndex: 100, transition: { duration: 0.6 } },
          hide: { opacity: 0.3, zIndex: -1 },
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
        // initial={{ y: '45px', x: '5px', opacity: 0.6 }}
        initial={{ y: '200px', x: '5px', opacity: 0.6 }}
        savedCode={savedCode}
        variants={{
          show: { opacity: 1 },
          hide: { opacity: 0.6, zIndex: -1 },
          shrink: { width: '380px', y: '5px' },
          showUp: { opacity: 1, zIndex: 2000 },
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

      <Mouse animate={mouseAnimation} initial={{ left: 240, top: 35 }}>
        <MouseClick animate={mouseClickAnimation} />
      </Mouse>
    </x.div>
  )
}
