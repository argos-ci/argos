import { Outlet, useParams } from "react-router-dom";
import {
  TabLink,
  TabLinkList,
  TabLinkPanel,
  useTabLinkState,
} from "@/modern/ui/TabLink";
import { Main } from "@/modern/containers/Layout";

export const Owner = () => {
  const { ownerLogin } = useParams();
  const tab = useTabLinkState();
  return (
    <>
      <TabLinkList state={tab} aria-label="Sections">
        <TabLink id={`/${ownerLogin}`} to="">
          Repositories
        </TabLink>
        <TabLink id={`/${ownerLogin}/settings`} to="settings">
          Settings
        </TabLink>
      </TabLinkList>
      <TabLinkPanel state={tab} as={Main} tabId={tab.selectedId || null}>
        <Outlet />
      </TabLinkPanel>
    </>
  );
};
