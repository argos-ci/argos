import { x } from '@xstyled/styled-components'

export const PageContainer = (props) => (
  <x.div maxWidth="1000px" mx="auto" px={{ _: 4, sm: 8 }} {...props} />
)
