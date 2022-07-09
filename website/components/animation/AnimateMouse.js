import { motion, useAnimation } from 'framer-motion'
import { x } from '@xstyled/styled-components'
import { useEffectOnce } from '@hooks/useEffectOnce'

const Circle = (props) => (
  <x.div
    borderRadius="full"
    w="23px"
    h="23px"
    border={2}
    backgroundColor="black-a10"
    borderColor="white"
    {...props}
  />
)

export const Mouse = ({ children, ...props }) => (
  <x.div
    opacity={0.4}
    as={motion.div}
    position="absolute"
    zIndex={1000}
    mt="-12px"
    ml="-12px"
    {...props}
  >
    {children}
    <Circle />
  </x.div>
)

export const MouseClick = (props) => (
  <Circle
    as={motion.div}
    initial={{ opacity: 0 }}
    position="absolute"
    backgroundColor="black-a90"
    borderColor="secondary"
    {...props}
  />
)

export function AnimateMouse({
  initial = { right: 130, top: 130 },
  to,
  delay = 1,
  velocity = 1.2,
  callback,
  ...props
}) {
  const containerAnimation = useAnimation()
  const cursorActiveAnimation = useAnimation()

  useEffectOnce(() => {
    async function startAnimations() {
      if (!to) return
      await containerAnimation.start({
        ...to,
        transition: { delay, duration: velocity },
      })
      await cursorActiveAnimation.start({
        opacity: 1,
        transition: { delay: 0.3, duration: 0.3 },
      })
      await cursorActiveAnimation.start({
        opacity: 0,
        transition: { duration: 0.3 },
      })
      await containerAnimation.start({ opacity: 0, transition: { delay: 0.1 } })
      if (callback) callback()
    }
    startAnimations()
  }, [cursorActiveAnimation, delay, containerAnimation, to, velocity, callback])

  return (
    <x.div
      as={motion.div}
      animate={containerAnimation}
      position="absolute"
      initial={initial}
      zIndex={1000}
      mt="-11px"
      ml="-11px"
      {...props}
    >
      <Circle
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={cursorActiveAnimation}
        position="absolute"
        backgroundColor="black-a90"
        borderColor="secondary"
      />
      <Circle />
    </x.div>
  )
}
