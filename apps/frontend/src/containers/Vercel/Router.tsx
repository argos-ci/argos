import { useCallback, useState } from "react";

import { FromTeam } from "./FromTeam";
import { ProjectsSummary } from "./ProjectsSummary";

type Account = {
  id: string;
  slug: string;
};

type VercelRouterProps = {
  accessToken: string;
  teamId: string | null;
  authUserAccount: Account;
  configurationId: string;
  next: string;
};

export type VercelNoAccountContext = {
  accessToken: string;
  teamId: string | null;
  setLinkedAccount: (account: Account) => void;
};

export type VercelAccountContext = {
  accessToken: string;
  configurationId: string;
  teamId: string | null;
  linkedAccount: Account;
  next: string;
};

export const VercelRouter = (props: VercelRouterProps) => {
  const [linkedAccount, setLinkedAccountState] = useState<null | Account>(
    () => {
      const sessionLinkedAccount = window.sessionStorage.getItem(
        "vercelLinkedAccount",
      );
      if (sessionLinkedAccount) {
        return JSON.parse(sessionLinkedAccount);
      }
      return props.teamId ? null : props.authUserAccount;
    },
  );

  const setLinkedAccount = useCallback((account: Account) => {
    setLinkedAccountState(account);
    window.sessionStorage.setItem(
      "vercelLinkedAccount",
      JSON.stringify(account),
    );
  }, []);

  if (linkedAccount) {
    const ctx: VercelAccountContext = {
      accessToken: props.accessToken,
      configurationId: props.configurationId,
      teamId: props.teamId,
      linkedAccount,
      next: props.next,
    };
    return <ProjectsSummary ctx={ctx} />;
  }

  if (props.teamId) {
    const ctx: VercelNoAccountContext = {
      accessToken: props.accessToken,
      teamId: props.teamId,
      setLinkedAccount,
    };
    return <FromTeam ctx={ctx} />;
  }

  throw new Error("Invariant: no team and no linked account");
};
