import { assertNever } from "@argos/util/assertNever";
import type { PartialModelObject } from "objection";

import { slugify } from "@/util/slug.js";

import { Account } from "../models/Account.js";
import { Team } from "../models/Team.js";
import { TeamUser } from "../models/TeamUser.js";
import { transaction } from "../transaction.js";

const resolveTeamSlug = async (name: string, index = 0): Promise<string> => {
  const nameSlug = slugify(name);
  const slug = index ? `${nameSlug}-${index}` : nameSlug;

  const existingAccount = await Account.query().select("id").findOne({ slug });

  if (!existingAccount) {
    return slug;
  }

  return resolveTeamSlug(name, index + 1);
};

export const createTeamAccount = async (props: {
  name: string;
  ownerId: string;
  githubAccountId?: string | null;
}) => {
  const slug = await resolveTeamSlug(props.name);
  return transaction(async (trx) => {
    const team = await Team.query(trx).insertAndFetch({
      defaultUserLevel: "member",
    });
    await TeamUser.query(trx).insert({
      userId: props.ownerId,
      teamId: team.id,
      userLevel: "owner",
    });
    const accountData: PartialModelObject<Account> = {
      name: props.name,
      slug,
      teamId: team.id,
    };
    if (props.githubAccountId) {
      accountData.githubAccountId = props.githubAccountId;
    }
    return Account.query(trx).insertAndFetch(accountData);
  });
};

/**
 * Get the label for a given team user level.
 */
export function getTeamUserLevelLabel(level: TeamUser["userLevel"]) {
  switch (level) {
    case "owner":
      return "Owner";
    case "member":
      return "Member";
    case "contributor":
      return "Contributor";
    default:
      assertNever(level);
  }
}
