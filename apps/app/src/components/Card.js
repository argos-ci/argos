import styled from "@xstyled/styled-components";
import {
  Card as SUICard,
  CardHeader as SUICardHeader,
  CardBody as SUICardBody,
  CardTitle as SUICardTitle,
  CardFooter as SUICardFooter,
} from "@smooth-ui/core-sc";

export const Card = styled(SUICard)`
  border-radius: base;
  background-color: light200;
  border: 0;
`;

export const CardBody = styled(SUICardBody)`
  padding: 3;
`;

export const CardText = styled.p`
  font-size: 13;

  &:first-child {
    margin-top: 0;
  }
`;

export const CardTitle = styled(SUICardTitle)`
  font-size: 18;
  font-weight: medium;
  margin: 0;
  color: darker;
`;

export const CardHeader = styled(SUICardHeader)`
  border-bottom: 1;
  border-bottom-color: light300;
  padding: 2;
`;

export const CardFooter = styled(SUICardFooter)`
  border-top: 1;
  border-top-color: light300;
  padding: 2;
`;

export const CardStat = styled.box`
  font-size: 36;
  color: darker;
  text-align: center;
  padding: 4;
`;
