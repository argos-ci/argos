import { x } from '@xstyled/styled-components'

export const Title = (props) => (
  <x.div fontSize="5xl" fontWeight="700" {...props} />
)

export const Subtitle = (props) => (
  <x.div
    fontSize="xl"
    color="white"
    fontWeight="400"
    lineHeight="normal"
    {...props}
  />
)
