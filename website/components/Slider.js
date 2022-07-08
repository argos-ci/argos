import { useEffect, useRef, useState } from 'react'
import { x } from '@xstyled/styled-components'
import { MuiLogo } from 'components/MuiLogo'
import { Image } from './Image'
import doctolibLogo from 'img/doctolib-logo.png'
import leMondeLogo from 'img/lemonde-logo.png'

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
    <x.div {...props}>
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
    </x.div>
  )
}

export const BrandsSlider = (props) => (
  <MobileSlider {...props}>
    <x.div display="flex" gap={4} alignItems="center">
      <x.div as={MuiLogo} h="50px" w="60px" />
      <x.div fontSize="6xl">MUI</x.div>
    </x.div>
    <Image src={doctolibLogo} alt="Logo Doctolib" w={200} />
    <Image src={leMondeLogo} alt="Logo Le Monde" w={200} />
  </MobileSlider>
)
