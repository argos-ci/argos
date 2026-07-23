import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import { PageLoader } from "@/ui/PageLoader";
import { TabList } from "@/ui/Tab";
import { TabLink, TabLinkPanel, TabsLink } from "@/ui/TabLink";

/**
 * Shell for the staff-only pages, mirroring the account layout so the staff
 * tooling reads as part of the app rather than as a side door.
 *
 * Access is enforced by each page's own query — the resolvers reject non-staff
 * users — so this layout is purely presentational.
 */
export function Component() {
  // The grey `Page` background is applied by each child page, not here, so the
  // tab bar sits on the app background like the account tabs do.
  return (
    <TabsLink className="flex min-h-0 flex-1 flex-col">
      <TabList className="px-4" aria-label="Staff navigation">
        <TabLink href="teams">All teams</TabLink>
        <TabLink href="trials">Trials</TabLink>
      </TabList>
      <hr className="border-t" />
      <TabLinkPanel className="flex flex-1 flex-col">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </TabLinkPanel>
    </TabsLink>
  );
}
