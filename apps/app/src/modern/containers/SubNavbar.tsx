import { createTeleporter } from "react-teleporter";

import { OwnerBreadcrumbItem } from "./Breadcrumb/OwnerBreadcrumb";
import { RepositoryBreadcrumbItem } from "./Breadcrumb/RepositoryBreadcrumb";

const Teleporter = createTeleporter();

export const SubNavbarTabs = (props: { children: React.ReactNode }) => {
  return <Teleporter.Source>{props.children}</Teleporter.Source>;
};

export const SubNavbar = () => {
  return (
    <div aria-label="Breadcrumb" className="container mx-auto px-4">
      <ol className="flex flex-wrap items-center gap-2 font-light">
        <OwnerBreadcrumbItem />
        <RepositoryBreadcrumbItem />
      </ol>
    </div>
  );
};
