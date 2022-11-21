import { createContext, useContext, useEffect, useMemo } from "react";

import { useQuery } from "@apollo/client";
import { useAuthToken, useLogout } from "./Auth";
import { graphql, DocumentType } from "@/gql";

const UserQuery = graphql(`
  query User {
    user {
      id
      email
      name
      login
      privateSync
      latestSynchronization {
        id
        jobStatus
      }
      installations {
        id
        latestSynchronization {
          id
          jobStatus
        }
      }
    }
  }
`);

type UserQueryData = DocumentType<typeof UserQuery>;

interface UserContextValue {
  user: UserQueryData["user"] | null;
  refetch: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserInitializer({ children }: { children: React.ReactNode }) {
  const token = useAuthToken();
  const logout = useLogout();
  const { error, data, refetch } = useQuery(UserQuery, {
    skip: !token,
  });

  if (error) {
    throw error;
  }

  // Remove token if outdated
  useEffect(() => {
    if (token && data?.user === null) {
      logout();
    }
  }, [token, data, logout]);
  const user = token && data ? data.user : null;
  const value = useMemo(() => ({ user, refetch }), [user, refetch]);
  if (!data && token) return null;
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUserContext = () => {
  const value = useContext(UserContext);
  if (!value) {
    throw new Error("UserContext not initialized");
  }
  return value;
};

export function useUser() {
  const { user } = useUserContext();
  return user;
}

export function useRefetchUser() {
  const { refetch } = useUserContext();
  return refetch;
}
