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
