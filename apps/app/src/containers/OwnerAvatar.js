import React from "react";
import { Avatar } from "@argos-ci/app/src/components";

export const OwnerAvatar = React.forwardRef(
  ({ owner, size, ...props }, ref) => {
    return (
      <Avatar
        ref={ref}
        alt={owner.name}
        src={`https://github.com/${owner.login}.png?size=60`}
        p={0}
        w={size === "sm" ? { _: 5, md: 6 } : 10}
        h={size === "sm" ? { _: 5, md: 6 } : 10}
        {...props}
      />
    );
  }
);
