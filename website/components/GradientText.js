import { x } from '@xstyled/styled-components'

export const GradientText = ({
  children,
  backgroundImage = 'gradient-to-l',
  gradientFrom = 'primary',
  gradientTo = 'white',
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
