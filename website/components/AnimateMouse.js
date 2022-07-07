import { motion, useAnimation } from 'framer-motion'
import { x } from '@xstyled/styled-components'
import { CursorIcon } from '@components/CursorIcon'
import { useEffectOnce } from 'Hooks/useEffectOnce'

const ClickCircle = (props) => (
  <x.div
    position="absolute"
    borderRadius="50%"
    border="1px solid #ccc"
    bg="rgba(2, 132, 199, 0.2)"
    w={35}
    h={35}
    {...props}
  />
)

export function AnimateMouse({
  from = { right: 130, top: 130 },
  to = { right: 20, top: 90 },
  delay = 1,
  velocity = 1.2,
  callback,
  ...props
}) {
  const moveMouseAnimation = useAnimation()
  const clickAnimation = useAnimation()

  useEffectOnce(() => {
    async function startAnimations() {
      await moveMouseAnimation.start({
        ...to,
        transition: { delay, duration: velocity },
      })
      await clickAnimation.start({
        opacity: 1,
        transition: { delay: 0.3, duration: 0.4 },
        transitionEnd: { opacity: 0 },
      })
      await moveMouseAnimation.start({ opacity: 0, transition: { delay: 0.1 } })
      if (callback) callback()
    }
    startAnimations()
  }, [clickAnimation, delay, moveMouseAnimation, to, velocity, callback])

  return (
    <x.div
      as={motion.div}
      animate={moveMouseAnimation}
      position="absolute"
      initial={from}
      zIndex={1000}
      {...props}
    >
      <ClickCircle
        as={motion.div}
        mt="-8px"
        ml="-8px"
        opacity={0}
        animate={clickAnimation}
      />
      <x.div as={CursorIcon} w={30} h={30} fill="white" />
    </x.div>
  )
}
