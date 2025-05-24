import { Suspense, type ComponentProps } from "react";
import { useParams } from "react-router-dom";

import { BrandLogo } from "@/ui/BrandLogo";
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
    <nav className="container mx-auto flex items-center justify-between p-4">
      <div className="flex shrink-0 items-center">
        <Tooltip content="Go to home">
          <HomeLink className="transition hover:brightness-125">
            <BrandLogo height={32} className="max-w-none" />
          </HomeLink>
        </Tooltip>
        <Suspense fallback={<BreadcrumbContainer aria-busy />}>
          <BreadcrumbContainer>
            <ol className="flex flex-wrap items-center gap-2 font-light">
              <AccountBreadcrumbItem />
              {accountSlug && projectName ? (
                <>
                  <BreadcrumbSeparator />
                  <ProjectBreadcrumbItem
                    accountSlug={accountSlug}
                    projectName={projectName}
                  />
                  {testId && (
                    <>
                      <BreadcrumbSeparator />
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

function BreadcrumbContainer(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-label="Breadcrumb"
      className="container mx-auto px-4"
    />
  );
}
