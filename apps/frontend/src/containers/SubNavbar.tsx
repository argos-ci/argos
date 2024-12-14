import { Suspense } from "react";

import { AccountBreadcrumbItem } from "./Breadcrumb/AccountBreadcrumb";
import { ProjectBreadcrumbItem } from "./Breadcrumb/ProjectBreadcrumb";

export const SubNavbar = () => {
  return (
    <Suspense
      fallback={
        <div
          aria-label="Breadcrumb"
          aria-busy
          className="container mx-auto px-4"
        />
      }
    >
      <div aria-label="Breadcrumb" className="container mx-auto px-4">
        <ol className="flex flex-wrap items-center gap-2 font-light">
          <AccountBreadcrumbItem />
          <ProjectBreadcrumbItem />
        </ol>
      </div>
    </Suspense>
  );
};
