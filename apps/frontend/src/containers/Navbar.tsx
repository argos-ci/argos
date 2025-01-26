import { BrandLogo } from "@/ui/BrandLogo";
import { Tooltip } from "@/ui/Tooltip";

import { HomeLink } from "./HomeLink";
import { NavUserControl } from "./NavUserControl";
import { SubNavbar } from "./SubNavbar";

export function Navbar() {
  return (
    <nav className="container mx-auto flex items-center justify-between p-4">
      <div className="flex shrink-0 items-center">
        <Tooltip content="Go to home">
          <HomeLink className="transition hover:brightness-125">
            <BrandLogo height={32} className="max-w-none" />
          </HomeLink>
        </Tooltip>
        <SubNavbar />
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <a
          href="https://argos-ci.com/discord"
          target="_blank"
          rel="noopener noreferrer"
          className="text-low hover:text-default font-medium transition"
        >
          Help & Community
        </a>
        <a
          href="https://argos-ci.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-low hover:text-default font-medium transition"
        >
          Docs
        </a>
        <NavUserControl />
      </div>
    </nav>
  );
}
