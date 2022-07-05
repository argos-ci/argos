import { x } from '@xstyled/styled-components'

export const Title = (props) => <x.div fontSize="4xl" {...props} />

export const Subtitle = (props) => (
  <x.div
    fontSize="xl"
    color="white"
    fontWeight="400"
    lineHeight="normal"
    {...props}
  />
)
