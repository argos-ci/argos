import { x } from '@xstyled/styled-components'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { GithubMergeStatus } from './GithubStatus'

export function AnimateGithubStatus({
  savedCode,
  status,
  setStatus,
  detailsButtonRef,
  ...props
}) {
  useEffect(() => {
    if (!savedCode) return
    setStatus('pending')
    const timer = setTimeout(() => setStatus('error'), 2800)
    return () => clearTimeout(timer)
  }, [savedCode, setStatus])

  return (
    <x.div position="absolute" w="500px" as={motion.div} {...props}>
      <x.div position="relative">
        <GithubMergeStatus
          status={status}
          detailsButtonRef={detailsButtonRef}
        />
      </x.div>
    </x.div>
  )
}
