import React from "react";
import { gql } from "graphql-tag";
import { useParams } from "react-router-dom";
import { FaExternalLinkAlt } from "react-icons/fa";
import {
  BaseLink,
  BreadcrumbItem,
  BreadcrumbItemMenu,
  BreadcrumbLink,
  BreadcrumbSeparator,
  IconLink,
  Menu,
  MenuButton,
  MenuButtonArrow,
  MenuItem,
  MenuSeparator,
  MenuText,
  MenuTitle,
  useMenuState,
} from "@argos-ci/app/src/components";
import { Query, useQuery } from "./Apollo";
import { OwnerAvatar } from "./OwnerAvatar";
import { useUser } from "./User";
import { useOwner, OwnerContextFragment } from "./OwnerContext";
import config from "../config";

const OWNER_QUERY = gql`
  query Owner($login: String!) {
    owner(login: $login) {
      ...OwnerContextFragment
    }
  }

  ${OwnerContextFragment}
`;

function OwnerSelect(props) {
  const { ownerLogin } = useParams();
  const user = useUser();
  const menu = useMenuState({ placement: "bottom", gutter: 4 });

  return (
    <Query
      query={gql`
        query Owners {
          owners {
            id
            name
            login
          }
        }
      `}
    >
      {({ owners }) => {
        const ownersList = owners
          .filter(({ login }) => login !== ownerLogin)
          .sort((ownerA, ownerB) =>
            String(ownerA.name).localeCompare(String(ownerB.name))
          );
        if (ownersList.length === 0) return null;

        return (
          <>
            <MenuButton state={menu} px={0} pt={2} {...props}>
              <MenuButtonArrow />
            </MenuButton>

            <Menu aria-label="Organizations list" state={menu}>
              <MenuTitle>Organizations</MenuTitle>
              <MenuSeparator />

              {user.login !== ownerLogin && (
                <MenuItem state={menu} as={BaseLink} to={`/${user.login}`}>
                  <OwnerAvatar owner={user} size="sm" />
                  {user.login}
                </MenuItem>
              )}

              {ownersList.map((owner) => (
                <MenuItem
                  key={owner.login}
                  state={menu}
                  as={BaseLink}
                  to={`/${owner.login}`}
                >
                  <OwnerAvatar owner={owner} size="sm" />
                  {owner.name}
                </MenuItem>
              ))}

              <MenuSeparator />
              <MenuText>
                Don’t see your org?
                <IconLink
                  href={config.get("github.appUrl")}
                  target="_blank"
                  rel="noopener noreferrer"
                  fontWeight="medium"
                  icon={FaExternalLinkAlt}
                  display="block"
                  mt={1}
                >
                  Manage access restrictions
                </IconLink>
              </MenuText>
            </Menu>
          </>
        );
      }}
    </Query>
  );
}

export function OwnerBreadcrumbItem() {
  const { ownerLogin } = useParams();
  const user = useUser();
  const { setOwner } = useOwner();
  const { loading, data = {} } = useQuery(OWNER_QUERY, {
    variables: { login: ownerLogin },
    fetchPolicy: "no-cache",
    skip: !user || !ownerLogin,
  });

  const { owner } = data;

  React.useEffect(() => {
    if (!loading && !!owner) {
      setOwner(owner);
    }
  }, [owner, loading, setOwner]);

  if (!owner) return null;

  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbLink to={`/${ownerLogin}`}>
          <OwnerAvatar owner={owner} size="sm" />
          {owner.login}
        </BreadcrumbLink>
        <BreadcrumbItemMenu>
          <OwnerSelect />
        </BreadcrumbItemMenu>
      </BreadcrumbItem>
    </>
  );
}
