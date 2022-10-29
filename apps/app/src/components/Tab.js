import { Link } from "react-router-dom";
import styled, { x } from "@xstyled/styled-components";
import { useIsMatchingTo } from "../containers/Router";

export const TabList = styled.menu`
  padding: 0;
  margin: 0 -2;
  margin-bottom: -1rpx;
  list-style-type: none;
  display: flex;
  font-weight: medium;
  font-size: sm;
`;

export const TabItem = styled.li`
  padding: 0;
  margin: 0;
  border-bottom: 1;
  border-color: transparent;
  transition: base;
  transition-property: border-color;

  &[aria-current="true"] {
    border-color: primary-text;
  }
`;

const TabItemLink = (props) => (
  <x.a
    as={Link}
    textDecoration="none"
    py={{ _: 2, md: 3 }}
    px={3}
    display="block"
    overflowX={{ _: "auto", md: "visible" }}
    {...props}
  />
);

export function TabNavLink({ children, to, exact, ...props }) {
  const isActive = useIsMatchingTo({ to, exact });

  return (
    <TabItem aria-current={isActive}>
      <TabItemLink to={to} {...props}>
        {children}
      </TabItemLink>
    </TabItem>
  );
}
