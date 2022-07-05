import { x } from '@xstyled/styled-components'

export const Paragraph = (props) => (
  <x.div
    color="secondary"
    lineHeight="normal"
    fontWeight="300"
    maxW={760}
    my={2}
    {...props}
  />
)
