import { createTeleporter } from "react-teleporter";

import { HomeBreadcrumbItem } from "./Breadcrumb/HomeBreadcrumb";
import { OwnerBreadcrumbItem } from "./Breadcrumb/OwnerBreadcrumb";
import { RepositoryBreadcrumbItem } from "./Breadcrumb/RepositoryBreadcrumb";

const Teleporter = createTeleporter();

export const SubNavbarTabs = (props: { children: React.ReactNode }) => {
  return <Teleporter.Source>{props.children}</Teleporter.Source>;
};

export const SubNavbar = () => {
  return (
    <div className="border-t border-b border-t-border border-b-border">
      <div className="container mx-auto px-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 py-4 font-light">
            <HomeBreadcrumbItem />
            <OwnerBreadcrumbItem />
            <RepositoryBreadcrumbItem />
          </ol>
        </nav>
        <Teleporter.Target />
      </div>
    </div>
  );
};
