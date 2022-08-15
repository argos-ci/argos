import React from "react";
import { Avatar } from "../components";

export const OwnerAvatar = React.forwardRef(
  ({ owner, size, ...props }, ref) => {
    return (
      <Avatar
        ref={ref}
        alt={owner.name}
        src={`https://github.com/${owner.login}.png?size=60`}
        p={0}
        width={size === "sm" ? { xs: 20, md: 25 } : 30}
        height={size === "sm" ? { xs: 20, md: 25 } : 30}
        {...props}
      />
    );
  }
);
