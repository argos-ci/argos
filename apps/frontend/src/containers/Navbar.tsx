import { Suspense, type ComponentProps } from "react";
import { useParams } from "react-router";

import { BrandLogo } from "@/ui/BrandLogo";
import { BrandShield } from "@/ui/BrandShield";
import { BreadcrumbSeparator } from "@/ui/Breadcrumb";
import { Tooltip } from "@/ui/Tooltip";

import { AccountBreadcrumbItem } from "./Breadcrumb/AccountBreadcrumb";
import { ProjectBreadcrumbItem } from "./Breadcrumb/ProjectBreadcrumb";
import { TestBreadcrumbItem } from "./Breadcrumb/TestBreadcrumb";
import { HomeLink } from "./HomeLink";
import { NavUserControl } from "./NavUserControl";

export function Navbar() {
  const { accountSlug, projectName, testId } = useParams();
  return (
    <nav className="container mx-auto flex items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-center">
        <Tooltip content="Go to home">
          <HomeLink className="shrink-0 transition hover:brightness-125">
            <BrandLogo height={32} className="max-w-none max-md:hidden" />
            <BrandShield className="h-6 md:hidden" />
          </HomeLink>
        </Tooltip>
        <Suspense fallback={<BreadcrumbContainer aria-busy />}>
          <BreadcrumbContainer>
            <ol className="flex items-center gap-2 font-light">
              <AccountBreadcrumbItem />
              {accountSlug && projectName ? (
                <>
                  <BreadcrumbSeparator className="max-md:hidden" />
                  <ProjectBreadcrumbItem
                    accountSlug={accountSlug}
                    projectName={projectName}
                  />
                  {testId && (
                    <>
                      <BreadcrumbSeparator className="max-md:hidden" />
                      <TestBreadcrumbItem
                        accountSlug={accountSlug}
                        projectName={projectName}
                        testId={testId}
                      />
                    </>
                  )}
                </>
              ) : null}
            </ol>
          </BreadcrumbContainer>
        </Suspense>
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <a
          href="https://argos-ci.com/discord"
          target="_blank"
          rel="noopener noreferrer"
          className="text-low hover:text-default font-medium transition max-md:hidden"
        >
          Help & Community
        </a>
        <a
          href="https://argos-ci.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-low hover:text-default font-medium transition max-md:hidden"
        >
          Docs
        </a>
        <NavUserControl />
      </div>
    </nav>
  );
}

function BreadcrumbContainer(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-label="Breadcrumb"
      className="container mx-auto min-w-0 px-4 max-md:px-3"
    />
  );
}
