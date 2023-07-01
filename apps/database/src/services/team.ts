import slugify from "@sindresorhus/slugify";
import type { PartialModelObject } from "objection";

import { Account } from "../models/Account.js";
import { Team } from "../models/Team.js";
import { TeamUser } from "../models/TeamUser.js";
import { transaction } from "../transaction.js";

export const resolveTeamSlug = async (
  name: string,
  index = 0
): Promise<string> => {
  const nameSlug = slugify(name);
  const slug = index ? `${nameSlug}-${index}` : nameSlug;

  const existingAccount = await Account.query()
    .select("id")
    .where({ slug })
    .first();

  if (!existingAccount) {
    return slug;
  }

  return resolveTeamSlug(name, index + 1);
};

export const createTeamAccount = async (props: {
  name: string;
  ownerId: string;
  githubAccountId?: string;
}) => {
  const slug = await resolveTeamSlug(props.name);
  return transaction(async (trx) => {
    const team = await Team.query(trx).insertAndFetch({});
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
