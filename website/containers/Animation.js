import { useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { x } from '@xstyled/styled-components'
import { CodeEditor } from '@components/AnimateCodeEditor'
import { Browser } from '@components/AnimateBrowser'
import { AnimateGithubStatus } from '@components/AnimateGithubStatus'
import { AnimateArgosScreenshots } from '@components/AnimateArgosScreenshots'

const CODE_BUG = `.priceTag {
  background: #7e22cecc;
  height: 13px;
}`

const CODE_FIX = `.priceTag {
  background: #7e22cecc;
}`

export function Animation() {
  const codeEditorAnimation = useAnimation()
  const githubAnimation = useAnimation()
  const browserAnimation = useAnimation()

  const [editorCode, setCode] = useState(CODE_BUG)
  const [savedCode, setSavedCode] = useState()
  const [githubStatus, setGithubStatus] = useState('pending')
  const [approvedScreenshots, setApprovedScreenshots] = useState(false)
  const [showArgos, setShowArgos] = useState(false)

  async function handleEditorSave(savedCode) {
    console.log('handleEditorSave')
    codeEditorAnimation.start({ opacity: 0.5, transition: { duration: 1 } })
    githubAnimation.start({
      opacity: 1,
      transition: { duration: 1 },
    })
    setSavedCode(savedCode)
  }

  async function handleGithubDetailsClick() {
    console.log('handleGithubDetailsClick')
    setShowArgos(true)
    await browserAnimation.start({
      opacity: 1,
      x: '30px',
      transition: { duration: 0.8 },
    })
    await githubAnimation.start({ opacity: 0.6 })
    await codeEditorAnimation.start({ opacity: 1 })
  }

  async function handleCloseBrowser() {
    console.log('handleCloseBrowser')
    await browserAnimation.start({
      opacity: 0,
      x: '50px',
      transition: { duration: 0.6 },
    })
    setShowArgos(false)
    setTimeout(() => setCode(CODE_FIX), 1000)
  }

  async function handleApproveDiff() {
    console.log('handleApproveDiff')
    setApprovedScreenshots(true)
    githubAnimation.start({
      zIndex: 2000,
      opacity: 1,
      transition: { delay: 0.5 },
    })
  }

  return (
    <x.div position="relative">
      <CodeEditor
        delayTyping={1000}
        w="350px"
        zIndex="100"
        as={motion.div}
        animate={codeEditorAnimation}
        callback={handleEditorSave}
        initial={{ y: '120px', x: '220px' }}
      >
        {editorCode}
      </CodeEditor>

      <AnimateGithubStatus
        status={githubStatus}
        setStatus={setGithubStatus}
        animate={githubAnimation}
        initial={{ y: 0, x: 0, opacity: 0.6 }}
        nextStatus={approvedScreenshots ? 'success' : 'error'}
        savedCode={savedCode}
        onDetailsClick={handleGithubDetailsClick}
      />

      <Browser
        as={motion.div}
        initial={{ opacity: 0, y: '-40px', x: '50px' }}
        animate={browserAnimation}
        onClose={handleCloseBrowser}
        autoCloseDelay={
          githubStatus === 'error' && savedCode !== CODE_FIX ? 4 : null
        }
      >
        <AnimateArgosScreenshots
          approve={savedCode === CODE_FIX}
          callback={handleApproveDiff}
          mouseMoveDelay={3}
          visible={showArgos}
        />
      </Browser>
    </x.div>
  )
}
