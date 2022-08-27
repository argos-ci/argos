import * as React from "react";
import { gql } from "graphql-tag";
import { x } from "@xstyled/styled-components";

export const OwnerAvatarFragment = gql`
  fragment OwnerAvatarFragment on Owner {
    name
    login
  }
`;

export const OwnerAvatar = React.forwardRef(
  ({ owner, size, ...props }, ref) => {
    const commonProps = {
      ref,
      w: size === "sm" ? { _: 5, md: 6 } : 10,
      h: size === "sm" ? { _: 5, md: 6 } : 10,
      borderRadius: "50%",
      ...props,
    };
    if (!owner) {
      return <x.div bg="highlight-background" {...commonProps} />;
    }
    return (
      <x.img
        alt={owner.name}
        src={`https://github.com/${owner.login}.png?size=60`}
        {...commonProps}
      />
    );
  }
);
