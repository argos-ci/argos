import { x } from '@xstyled/styled-components'
import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationFrame, useTime, useTransform } from 'framer-motion'
import { GithubMergeStatus } from './GithubMergeStatus'
import { AnimateMouse } from './AnimateMouse'

export function AnimateGithubStatus({
  nextStatus,
  savedCode,
  onDetailsClick,
  status,
  setStatus,
  ...props
}) {
  useEffect(() => {
    if (!savedCode) return
    setStatus('pending')
    const timer = setTimeout(() => setStatus(nextStatus), 2000)
    return () => clearTimeout(timer)
  }, [savedCode, setStatus, nextStatus])

  return (
    <x.div position="absolute" w="500px" as={motion.div} {...props}>
      <x.div position="relative">
        <GithubMergeStatus status={status} />
        {status === 'error' ? (
          <AnimateMouse
            from={{ opacity: 0, right: 0, top: 100 }}
            to={{ opacity: 1, right: 20, top: 85 }}
            delay={0.3}
            velocity={1.2}
            callback={onDetailsClick}
          />
        ) : null}
      </x.div>
    </x.div>
  )
}
