import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { x } from '@xstyled/styled-components'
import { CodeEditor } from '@components/animation/CodeEditor'
import { Browser } from '@components/animation/Browser'
import { AnimateGithubStatus } from '@components/animation/AnimateGithubStatus'
import { AnimateArgosScreenshots } from '@components/animation/AnimateArgosScreenshots'
import { Mouse, MouseClick } from './Mouse'
import { MouseInitializer, useMouse } from './MouseContext'

const CODE_BUG = `.priceTag {
  background: #7e22ce;
  height: 13px;
}`

const CODE_FIX = `.priceTag {
  background: #7e22ce;
}`

const Canvas = forwardRef(({ ...props }, ref) => {
  const { moveToRef, mouseAnimation, mouseClickAnimation } = useMouse()
  const codeEditorAnimation = useAnimation()
  const githubAnimation = useAnimation()
  const browserAnimation = useAnimation()
  const argosScrollAnimation = useAnimation()

  const [removeCodeLines, setRemoveCodeLines] = useState()
  const [savedCode, setSavedCode] = useState()
  const [githubStatus, setGithubStatus] = useState('pending')

  const githubButtonRef = useRef()
  const closeBrowserButtonRef = useRef()
  const argosApproveButtonRef = useRef()

  useEffect(() => {
    switch (savedCode) {
      case CODE_BUG:
        failArgosAnimation()
        break

      case CODE_FIX:
        successArgosAnimation()
        break

      default:
        break
    }
  }, [savedCode, failArgosAnimation, successArgosAnimation])

  const failArgosAnimation = useCallback(async () => {
    console.log('failArgosAnimation')

    await githubAnimation.start('show')
    await moveToRef(githubButtonRef, { delay: 1 })

    await browserAnimation.start('show')
    await moveToRef(closeBrowserButtonRef, { delay: 2 })
    await githubAnimation.start('background')
    browserAnimation.start('hide')
    setTimeout(() => setRemoveCodeLines([2]), 1500)
  }, [browserAnimation, githubAnimation, moveToRef])

  const successArgosAnimation = useCallback(async () => {
    console.log('successArgosAnimation')
    await browserAnimation.start('show')
    githubAnimation.start('shrink')
    await moveToRef(argosApproveButtonRef, { delay: 1 })
    setGithubStatus('success')
    await githubAnimation.start('showUp')
  }, [browserAnimation, githubAnimation, moveToRef])

  return (
    <x.div position="relative" m={0} ref={ref} {...props}>
      <CodeEditor
        typingDelay={500}
        w="400px"
        zIndex="100"
        as={motion.div}
        initial={{ y: '10px', x: '10px', zIndex: -1 }}
        variants={{
          show: { opacity: 1, zIndex: 100, transition: { duration: 0.6 } },
        }}
        animate={codeEditorAnimation}
        onSave={setSavedCode}
        removeCodeLines={removeCodeLines}
      >
        {CODE_BUG}
      </CodeEditor>

      <AnimateGithubStatus
        status={githubStatus}
        setStatus={setGithubStatus}
        animate={githubAnimation}
        initial={{
          y: '210px',
          x: '60px',
          width: '500px',
          zIndex: -1,
          opacity: 0,
        }}
        savedCode={savedCode === CODE_BUG}
        variants={{
          show: { opacity: 1 },
          background: { zIndex: -2, opacity: 0.6 },
          showUp: { opacity: 1, zIndex: 2000 },
        }}
        detailsButtonRef={githubButtonRef}
      />

      <Browser
        initial={{ opacity: 0, y: '0px', x: '0px' }}
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
          // scrollAnimation={argosScrollAnimation}
          approveButtonRef={argosApproveButtonRef}
          approved={githubStatus === 'success'}
        />
      </Browser>

      <Mouse animate={mouseAnimation} initial={{ left: 240, top: 35 }}>
        <MouseClick animate={mouseClickAnimation} />
      </Mouse>
    </x.div>
  )
})

export function Animation(props) {
  const mouseAnimation = useAnimation()
  const mouseClickAnimation = useAnimation()

  const canvasRef = useRef()

  return (
    <MouseInitializer
      parentRef={canvasRef}
      scale={props.scale}
      mouseAnimation={mouseAnimation}
      mouseClickAnimation={mouseClickAnimation}
    >
      <Canvas ref={canvasRef} {...props} />
    </MouseInitializer>
  )
}
