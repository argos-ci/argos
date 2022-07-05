import { x } from '@xstyled/styled-components'
import { useEffect, useRef, useState } from 'react'

export const Slide = (props) => <x.div minW="100%" {...props} />

export function Slider({ children, ...props }) {
  const [slideIndex, setSlideIndex] = useState(0)
  const time = 1800
  const loopIndexRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      if (loopIndexRef.current === 1 || children.length === slideIndex) {
        setSlideIndex((prev) => (prev + 1) % (children.length + 1))
      }
      loopIndexRef.current = (loopIndexRef.current + 1) % 2
    }, time / 2)

    return () => clearInterval(interval)
  })

  return (
    <x.div w={1} overflow="hidden" {...props}>
      <x.div
        display="flex"
        transform
        translateX={`-${100 * slideIndex}%`}
        transitionDuration={slideIndex ? '900ms' : 0}
      >
        {children}
        {children[0]}
      </x.div>
    </x.div>
  )
}

export function MobileSlider({ children, ...props }) {
  return (
    <>
      <Slider display={{ xs: 'block', md: 'none' }}>
        {children.map((child, index) => (
          <Slide display="flex" justifyContent="center" key={index}>
            {child}
          </Slide>
        ))}
      </Slider>

      <x.div
        justifyContent="space-between"
        alignItems="center"
        display={{ xs: 'none', md: 'flex' }}
      >
        {children.map((child, index) => (
          <x.div key={index}>{child}</x.div>
        ))}
      </x.div>
    </>
  )
}
