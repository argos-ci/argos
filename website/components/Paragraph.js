import { x } from '@xstyled/styled-components'

export const Paragraph = (props) => (
  <x.div
    color="secondary"
    lineHeight="normal"
    maxW={650}
    my={2}
    fontSize="18px"
    {...props}
  />
)
