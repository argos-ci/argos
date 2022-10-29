import { gql } from "graphql-tag";
import { x } from "@xstyled/styled-components";
import { forwardRef } from "react";

export const OwnerAvatarFragment = gql`
  fragment OwnerAvatarFragment on Owner {
    name
    login
  }
`;

export const OwnerAvatar = forwardRef(({ owner, size, ...props }, ref) => {
  const commonProps = {
    ref,
    w: size === "sm" ? { _: 5, md: 6 } : "32px",
    h: size === "sm" ? { _: 5, md: 6 } : "32px",
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
});
