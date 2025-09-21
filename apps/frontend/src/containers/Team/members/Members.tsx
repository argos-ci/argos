import { Suspense, useState } from "react";
import { SearchIcon } from "lucide-react";
import { TabPanel, Tabs } from "react-aria-components";

import { useAssertAuthTokenPayload } from "@/containers/Auth";
import { DocumentType, graphql } from "@/gql";
import { AccountPermission, TeamUserLevel } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { DialogTrigger } from "@/ui/Dialog";
import { List, ListRowLoader } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { Tab, TabList } from "@/ui/Tab";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";

import { TeamGithubMembersList } from "./GitHubMembersList";
import { InviteDialog } from "./InviteDialog";
import { TeamInvitesList } from "./InvitesList";
import { LeaveTeamDialog } from "./LeaveTeamDialog";
import { TeamMembersList } from "./MembersList";
import { RemoveFromTeamDialog, type RemovedUser } from "./RemoveFromTeamDialog";

const _TeamFragment = graphql(`
  fragment TeamMembers_Team on Team {
    id
    name
    slug
    inviteLink
    permissions
    ssoGithubAccount {
      id
      ...TeamGithubMembersList_GithubAccount
    }
    plan {
      id
      fineGrainedAccessControlIncluded
    }
    me {
      id
      level
    }
    ...InviteDialog_Team
    ...InvitesList_Team
  }
`);

function ListPlaceholder() {
  return (
    <div className="my-4">
      <div className="mb-2 flex gap-2">
        <TextInputGroup className="w-full">
          <TextInputIcon>
            <SearchIcon />
          </TextInputIcon>
          <TextInput disabled type="search" placeholder="Filter…" />
        </TextInputGroup>
      </div>
      <List className="opacity-disabled">
        <ListRowLoader className="p-4">Loading…</ListRowLoader>
      </List>
    </div>
  );
}

export function TeamMembers(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const authPayload = useAssertAuthTokenPayload();
  const [removedUser, setRemovedUser] = useState<RemovedUser | null>(null);
  const removeFromTeamModal = {
    isOpen: removedUser !== null,
    onOpenChange: (open: boolean) => {
      if (!open) {
        setRemovedUser(null);
      }
    },
  };
  const me = team.me;
  const amOwner =
    team.permissions.includes(AccountPermission.Admin) ||
    Boolean(me && me.level === TeamUserLevel.Owner);
  const hasGithubSSO = Boolean(team.ssoGithubAccount);
  const hasFineGrainedAccessControl = Boolean(
    team.plan?.fineGrainedAccessControlIncluded,
  );
  const teamName = team.name || team.slug;

  return (
    <Card>
      <CardBody>
        <CardTitle>Members</CardTitle>
        <CardParagraph>
          Add members to your team to give them access to your projects.
        </CardParagraph>
        <Tabs>
          <TabList className="border-b">
            <Tab id="members">Members</Tab>
            {team.ssoGithubAccount ? (
              <Tab id="pending-github-members">Pending GitHub Members</Tab>
            ) : null}
            <Tab id="pending">Pending Invitations</Tab>
          </TabList>
          <TabPanel id="members" className="my-4">
            <TeamMembersList
              teamId={team.id}
              amOwner={amOwner}
              onRemove={setRemovedUser}
              hasGithubSSO={hasGithubSSO}
              hasFineGrainedAccessControl={hasFineGrainedAccessControl}
            />
          </TabPanel>
          {team.ssoGithubAccount ? (
            <TabPanel id="pending-github-members" className="my-4">
              <Suspense fallback={<ListPlaceholder />}>
                <TeamGithubMembersList
                  teamId={team.id}
                  teamName={teamName}
                  githubAccount={team.ssoGithubAccount}
                  amOwner={amOwner}
                  onRemove={setRemovedUser}
                  hasFineGrainedAccessControl={hasFineGrainedAccessControl}
                />
              </Suspense>
            </TabPanel>
          ) : null}
          <TabPanel id="pending" className="my-4">
            <Suspense fallback={<ListPlaceholder />}>
              <TeamInvitesList team={team} amOwner={amOwner} />
            </Suspense>
          </TabPanel>
        </Tabs>
        <Modal {...removeFromTeamModal}>
          {removedUser ? (
            authPayload.account.id === removedUser.id ? (
              <LeaveTeamDialog teamName={teamName} teamAccountId={team.id} />
            ) : (
              <RemoveFromTeamDialog
                teamName={teamName}
                teamAccountId={team.id}
                user={removedUser}
              />
            )
          ) : null}
        </Modal>
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        {team.inviteLink ? (
          <>
            <div>Invite people to collaborate in the team.</div>
            <DialogTrigger>
              <Button variant="secondary">Invite</Button>
              <Modal>
                <InviteDialog team={team} />
              </Modal>
            </DialogTrigger>
          </>
        ) : (
          <>
            <div>Only a owners can invite people in the team.</div>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
