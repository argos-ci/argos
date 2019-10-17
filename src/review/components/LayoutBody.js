import styled, { css } from '@xstyled/styled-components'
import { breakpoints, variant } from '@xstyled/system'

const LayoutBody = styled.box`
  position: relative;
  width: auto;
  margin-left: 40;
  margin-right: 40;

  ${breakpoints({
    md: css`
      width: 880rpx;
      margin-left: auto;
      margin-right: auto;
    `,
    lg: css`
      width: 66.66%;
    `,
    xxl: css`
      width: 1200;
    `,
  })}

  ${variant({
    variants: {
      fullHeight: css`
        height: 100%;
      `,
      margin: css`
        margin: 24rpx;
      `,
      marginBottom: css`
        margin-bottom: 32rpx;
      `,
    },
  })}
`

export default LayoutBody
