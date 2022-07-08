import { useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { x } from '@xstyled/styled-components'
import { CodeEditor } from '@components/animation/AnimateCodeEditor'
import { AutoCloseBrowser } from '@components/animation/Browser'
import { AnimateGithubStatus } from '@components/animation/AnimateGithubStatus'
import { AnimateArgosScreenshots } from '@components/animation/AnimateArgosScreenshots'

const CODE_BUG = `.priceTag {
  background: #7e22cecc;
  height: 13px;
}`

const CODE_FIX = `.priceTag {
  background: #7e22cecc;
}`

export function Animation(props) {
  const codeEditorAnimation = useAnimation()
  const githubAnimation = useAnimation()
  const browserAnimation = useAnimation()

  const [editorCode, setCode] = useState(CODE_BUG)
  const [savedCode, setSavedCode] = useState()
  const [githubStatus, setGithubStatus] = useState('success')
  const [showArgos, setShowArgos] = useState(false)

  async function handleEditorSave(savedCode) {
    console.log('handleEditorSave')
    codeEditorAnimation.start({ opacity: 0.3, transition: { duration: 0.6 } })
    githubAnimation.start({
      opacity: 1,
      transition: { duration: 1 },
    })
    setSavedCode(savedCode)
  }

  async function handleGithubDetailsClick() {
    console.log('handleGithubDetailsClick')
    setShowArgos(true)
    await browserAnimation.start({ opacity: 1, transition: { duration: 0.8 } })
    await githubAnimation.start({ opacity: 0.6 })
    await codeEditorAnimation.start({ opacity: 1 })
  }

  async function handleCloseBrowser() {
    console.log('handleCloseBrowser')
    await browserAnimation.start({ opacity: 0, transition: { duration: 0.6 } })
    setShowArgos(false)
    setTimeout(() => setCode(CODE_FIX), 1000)
  }

  async function handleApproveDiff() {
    console.log('handleApproveDiff')
    setGithubStatus('success')
    githubAnimation.start({ zIndex: 2000, opacity: 1, width: 380 })
  }

  return (
    <x.div position="absolute" {...props}>
      <CodeEditor
        delayTyping={1000}
        w="300px"
        zIndex="100"
        as={motion.div}
        animate={codeEditorAnimation}
        callback={handleEditorSave}
        initial={{ y: '160px', x: '220px' }}
      >
        {editorCode}
      </CodeEditor>

      <AnimateGithubStatus
        status={githubStatus}
        setStatus={setGithubStatus}
        animate={githubAnimation}
        initial={{ y: '45px', x: '5px', opacity: 0.6 }}
        savedCode={savedCode}
        onDetailsClick={handleGithubDetailsClick}
      />

      <AutoCloseBrowser
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={browserAnimation}
        onClose={handleCloseBrowser}
        autoCloseDelay={
          githubStatus === 'error' && savedCode !== CODE_FIX ? 4 : null
        }
      >
        <AnimateArgosScreenshots
          approve={savedCode === CODE_FIX}
          callback={handleApproveDiff}
          mouseMoveDelay={2}
          visible={showArgos}
        />
      </AutoCloseBrowser>
    </x.div>
  )
}
