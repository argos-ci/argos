import { createTeleporter } from "react-teleporter";

import { AccountBreadcrumbItem } from "./Breadcrumb/AccountBreadcrumb";
import { ProjectBreadcrumbItem } from "./Breadcrumb/ProjectBreadcrumb";

const Teleporter = createTeleporter();

export const SubNavbarTabs = (props: { children: React.ReactNode }) => {
  return <Teleporter.Source>{props.children}</Teleporter.Source>;
};

export const SubNavbar = () => {
  return (
    <div aria-label="Breadcrumb" className="container mx-auto px-4">
      <ol className="flex flex-wrap items-center gap-2 font-light">
        <AccountBreadcrumbItem />
        <ProjectBreadcrumbItem />
      </ol>
    </div>
  );
};
