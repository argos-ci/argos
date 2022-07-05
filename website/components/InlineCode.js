import { x } from '@xstyled/styled-components'

export const InlineCode = (props) => (
  <x.span
    backgroundColor="blue-gray-800"
    color="red-400"
    py={0}
    px={1}
    border={1}
    borderColor="blue-gray-700"
    borderRadius="sm"
    {...props}
  />
)
