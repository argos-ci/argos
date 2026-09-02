import { Suspense } from "react";

import { useAssertAuthAccount } from "@/containers/Auth";
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
import { DialogTrigger, useDialogValueState } from "@/ui/Dialog";
import { List, ListRowLoader } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { Tab, TabList, TabPanel, Tabs } from "@/ui/Tab";

import { TeamGithubMembersList } from "./GitHubMembersList";
import { InviteDialog } from "./InviteDialog";
import { TeamInvitesList } from "./InvitesList";
import { LeaveTeamDialog } from "./LeaveTeamDialog";
import { TeamMembersList } from "./MembersList";
import { RemoveFromTeamDialog, type RemovedUser } from "./RemoveFromTeamDialog";
import { SearchFilter } from "./SearchFilter";

const _TeamFragment = graphql(`
  fragment TeamMembers_Team on Team {
    id
    name
    slug
    inviteLink
    permissions
    ssoGithubAccount {
      id
      ...GitHubMembersList_GithubAccount
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
    <div>
      <div className="mb-2 flex gap-2">
        <SearchFilter disabled value="" />
      </div>
      <List className="opacity-disabled">
        <ListRowLoader delay={0} className="p-4">
          Loading…
        </ListRowLoader>
      </List>
    </div>
  );
}

export function TeamMembers(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const authAccount = useAssertAuthAccount();
  const removing = useDialogValueState<RemovedUser | null>(null);
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
        <Tabs defaultValue="members">
          <TabList className="border-b">
            <Tab value="members">Members</Tab>
            {team.ssoGithubAccount ? (
              <Tab value="pending-github-members">Pending GitHub Members</Tab>
            ) : null}
            {amOwner ? <Tab value="pending">Pending Invitations</Tab> : null}
          </TabList>
          <TabPanel value="members" className="my-4">
            <Suspense fallback={<ListPlaceholder />}>
              <TeamMembersList
                teamId={team.id}
                amOwner={amOwner}
                onRemove={removing.open}
                hasGithubSSO={hasGithubSSO}
                hasFineGrainedAccessControl={hasFineGrainedAccessControl}
              />
            </Suspense>
          </TabPanel>
          {team.ssoGithubAccount ? (
            <TabPanel value="pending-github-members" className="my-4">
              <Suspense fallback={<ListPlaceholder aria-busy />}>
                <TeamGithubMembersList
                  teamId={team.id}
                  teamName={teamName}
                  githubAccount={team.ssoGithubAccount}
                  amOwner={amOwner}
                  onRemove={removing.open}
                  hasFineGrainedAccessControl={hasFineGrainedAccessControl}
                />
              </Suspense>
            </TabPanel>
          ) : null}
          {amOwner ? (
            <TabPanel value="pending" className="my-4">
              <Suspense fallback={<ListPlaceholder aria-busy />}>
                <TeamInvitesList team={team} amOwner={amOwner} />
              </Suspense>
            </TabPanel>
          ) : null}
        </Tabs>
        <Modal open={removing.isOpen} onOpenChange={removing.onOpenChange}>
          {removing.value ? (
            authAccount.id === removing.value.id ? (
              <LeaveTeamDialog teamName={teamName} teamAccountId={team.id} />
            ) : (
              <RemoveFromTeamDialog
                teamName={teamName}
                teamAccountId={team.id}
                user={removing.value}
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
