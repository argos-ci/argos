import { Link as RouterLink } from "react-router-dom";

import { BrandLogo } from "@/ui/BrandLogo";
import { Tooltip } from "@/ui/Tooltip";

import { NavUserControl } from "./NavUserControl";
import { SubNavbar } from "./SubNavbar";

export const Navbar = () => {
  return (
    <nav className="container mx-auto flex items-center justify-between p-4">
      <div className="flex shrink-0 items-center">
        <Tooltip content="Go to home">
          <RouterLink to="/" className="transition hover:brightness-125">
            <BrandLogo height={32} className="max-w-none" />
          </RouterLink>
        </Tooltip>
        <SubNavbar />
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <a
          href="https://argos-ci.com/discord"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-low transition hover:text"
        >
          Help & Community
        </a>
        <a
          href="https://argos-ci.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-low transition hover:text"
        >
          Docs
        </a>
        <NavUserControl />
      </div>
    </nav>
  );
};
