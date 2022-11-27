import { useParams } from "react-router-dom";

import { TabList, TabNavLink } from "@/components";
import { SubNavbarTabs } from "@/modern/containers/SubNavbar";

export function OwnerTabs() {
  const { ownerLogin } = useParams();

  return (
    <SubNavbarTabs>
      <TabList>
        <TabNavLink exact to={`/${ownerLogin}`}>
          Repositories
        </TabNavLink>
        <TabNavLink to={`/${ownerLogin}/settings`}>Settings</TabNavLink>
      </TabList>
    </SubNavbarTabs>
  );
}
