import styled from '@xstyled/styled-components'

const ScrollView = styled.box`
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
  overflow-x: hidden;
  --webkit-overflow-scrolling: touch;
`

export default ScrollView
