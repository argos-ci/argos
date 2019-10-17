import styled from '@xstyled/styled-components'

export const Card = styled.box`
  border-radius: base;
  background-color: gray800;
`

export const CardBody = styled.box`
  padding: 3;
`

export const CardText = styled.p`
  font-size: 13;
`

export const CardTitle = styled.h3`
  font-size: 18;
  font-weight: medium;
  margin: 0;
  color: white;
`

export const CardHeader = styled.headerBox`
  border-bottom: 1;
  border-bottom-color: gray700;
  padding: 2;
`

export const CardFooter = styled.footerBox`
  border-top: 1;
  border-top-color: gray700;
  padding: 2;
`

export const CardStat = styled.box`
  font-size: 36;
  color: white;
  text-align: center;
  padding: 4;
`
