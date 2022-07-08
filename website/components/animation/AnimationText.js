import { x } from '@xstyled/styled-components'

export const GradientText = ({
  children,
  backgroundImage = 'gradient-to-l',
  gradientFrom = '#6b21a8ff',
  gradientTo = '#c084fcff',
  ...props
}) => (
  <x.span {...props}>
    <x.span
      backgroundClip="text"
      color="transparent"
      backgroundImage={backgroundImage}
      gradientFrom={gradientFrom}
      gradientTo={gradientTo}
    >
      {children}
    </x.span>
  </x.span>
)

export const Text = (props) => (
  <x.div
    lineHeight={1.3}
    borderColor="white"
    borderLeft={1}
    color="#94a3b8ff"
    fontSize={20}
    mx={5}
    pt={2}
    pb={1}
    pl={5}
    transition="opacity 1000ms 700ms"
    {...props}
  />
)
