import styled, { css } from '@xstyled/styled-components'
import { up } from '@xstyled/system'
import { Container } from './Container'
import { FadeLink } from './Link'

export const Header = styled.header`
  background-color: light200;
  color: darker;
  border-top: 1;
  border-bottom: 1;
  border-color: light300;
`

export const HeaderTitle = styled.h2`
  margin: 0;
  font-weight: 300;
  display: flex;
  align-items: center;
  flex: 1;
  font-size: 18;
  margin-bottom: 2;

  ${up(
    'md',
    css`
      font-size: 24;
      margin-bottom: 0;
    `,
  )}
`

export const HeaderPrimary = styled.div`
  display: flex;
  flex-direction: column;
  margin: 3 0;

  ${up(
    'md',
    css`
      flex-direction: row;
      align-items: center;
      margin: 4 0;
    `,
  )}
`

export const HeaderSecondaryLink = styled(FadeLink)`
  margin-top: 2;
  font-size: 14;
  display: flex;
  align-items: center;
  color: darker;
`

export const HeaderBody = Container
