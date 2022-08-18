import React, { useState } from "react";
import { gql } from "graphql-tag";

export const OwnerContextFragment = gql`
  fragment OwnerContextFragment on Owner {
    id
    name
    login
    permissions
    purchases {
      id
      startDate
      endDate
      plan {
        id
        name
        screenshotsLimitPerMonth
      }
    }
    currentMonthUsedScreenshots
  }
`;

export const OwnerRepositoriesFragment = gql`
  fragment OwnerRepositoriesFragment on Owner {
    id
    name
    login
    type
    repositories {
      id
      name
      updatedAt
      enabled
      builds(first: 1, after: 0) {
        pageInfo {
          totalCount
        }
        edges {
          id
          updatedAt
          status
          number
        }
      }
    }
  }
`;

const OwnerContext = React.createContext();

export function OwnerProvider({ children }) {
  const [owner, setOwner] = useState(null);

  const value = React.useMemo(() => {
    return {
      owner: owner ? { ...owner, name: owner.name || owner.login || "" } : null,
      setOwner,
    };
  }, [owner]);

  return (
    <OwnerContext.Provider value={value}>{children}</OwnerContext.Provider>
  );
}

export function useOwner() {
  return React.useContext(OwnerContext);
}
