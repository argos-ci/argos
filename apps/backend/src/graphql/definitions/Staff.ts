import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import { Account, StaffTeamContact } from "@/database/models";

import type { IResolvers } from "../__generated__/resolver-types";
import { badUserInput, forbidden, unauthenticated } from "../util";

const { gql } = gqlTag;

/**
 * Upper bound on the trial pipeline window. Each returned team drives an
 * aggregate over `projects` joined to `builds`, so an unbounded window would
 * scan the whole build history.
 */
const MAX_TRIAL_PIPELINE_DAYS = 365;

export const typeDefs = gql`
  "An owner of a team, as needed to write to them."
  type TeamStaffOwner {
    id: ID!
    name: String
    email: String
  }

  "Trace of a staff member reaching out to a team."
  type TeamStaffContact {
    id: ID!
    date: DateTime!
    user: User!
  }

  """
  Team data reserved to Argos staff.

  Everything staff-only lives under this one type so a single guard covers it:
  adding a field here cannot leak it, whereas a field added directly to \`Team\`
  is public until someone remembers to guard it.
  """
  type TeamStaffInfo {
    projectsCount: Int!
    buildsCount: Int!
    "Screenshots uploaded since the team was created"
    screenshotsCount: Int!
    "When the team got its first build compared to a baseline"
    firstComparisonAt: DateTime
    owners: [TeamStaffOwner!]!
    "When a staff member reached out to the team, null if never"
    contact: TeamStaffContact
  }

  extend type Team {
    "Staff-only data. Null for everyone else."
    staff: TeamStaffInfo
  }

  input SetTeamStaffContactInput {
    teamAccountId: ID!
    contacted: Boolean!
  }

  extend type Query {
    "List all teams (staff only)"
    staffTeams: [Team!]!
    "List teams created within the last \`days\` days, newest first (staff only)"
    staffTrialPipeline(days: Int! = 30): [Team!]!
  }

  extend type Mutation {
    "Record or clear that a staff member reached out to a team (staff only)"
    setTeamStaffContact(input: SetTeamStaffContactInput!): Team!
  }
`;

export const resolvers: IResolvers = {
  Team: {
    staff: (account, _args, ctx) => {
      // The only guard on staff data: `TeamStaffInfo` resolves against the
      // account, so returning null here withholds every field under it.
      if (!ctx.auth?.user.staff) {
        return null;
      }
      return account;
    },
  },
  TeamStaffInfo: {
    projectsCount: async (account, _args, ctx) => {
      const activation = await ctx.loaders.AccountActivationByAccountId.load(
        account.id,
      );
      return activation.projectsCount;
    },
    buildsCount: async (account, _args, ctx) => {
      const activation = await ctx.loaders.AccountActivationByAccountId.load(
        account.id,
      );
      return activation.buildsCount;
    },
    screenshotsCount: async (account, _args, ctx) => {
      const activation = await ctx.loaders.AccountActivationByAccountId.load(
        account.id,
      );
      return activation.screenshotsCount;
    },
    firstComparisonAt: async (account, _args, ctx) => {
      const activation = await ctx.loaders.AccountActivationByAccountId.load(
        account.id,
      );
      return activation.firstComparisonAt;
    },
    owners: async (account, _args, ctx) => {
      invariant(account.teamId, "not a team account");
      return ctx.loaders.TeamOwnersByTeamId.load(account.teamId);
    },
    contact: async (account, _args, ctx) => {
      invariant(account.teamId, "not a team account");
      return ctx.loaders.StaffTeamContactByTeamId.load(account.teamId);
    },
  },
  TeamStaffContact: {
    date: (contact) => new Date(contact.createdAt),
    user: async (contact, _args, ctx) => {
      const account = await ctx.loaders.AccountFromRelation.load({
        userId: contact.userId,
      });
      invariant(account, "user account not found");
      return account;
    },
  },
  Query: {
    staffTeams: async (_root, _args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      if (!ctx.auth.user.staff) {
        throw forbidden();
      }

      return Account.query()
        .whereNotNull("teamId")
        .whereNull("userId")
        .orderByRaw("coalesce(name, slug) asc");
    },
    staffTrialPipeline: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      if (!ctx.auth.user.staff) {
        throw forbidden();
      }

      if (args.days < 1 || args.days > MAX_TRIAL_PIPELINE_DAYS) {
        throw badUserInput(
          `\`days\` must be between 1 and ${MAX_TRIAL_PIPELINE_DAYS}.`,
        );
      }

      // Newest first: the list is read as a feed of what just happened, not
      // as a directory. The id breaks ties so the order is total.
      return Account.query()
        .whereNotNull("teamId")
        .whereNull("userId")
        .whereRaw(`accounts."createdAt" >= now() - make_interval(days => ?)`, [
          args.days,
        ])
        .orderBy("createdAt", "desc")
        .orderBy("id", "desc");
    },
  },
  Mutation: {
    setTeamStaffContact: async (_root, args, ctx) => {
      if (!ctx.auth) {
        throw unauthenticated();
      }

      if (!ctx.auth.user.staff) {
        throw forbidden();
      }

      const teamAccount = await Account.query()
        .findById(args.input.teamAccountId)
        .throwIfNotFound();

      // The field is declared as `Team!`: handing back a personal account here
      // would resolve as `User` and break the response against the schema.
      if (!teamAccount.teamId) {
        throw badUserInput("Account is not a team.");
      }

      if (args.input.contacted) {
        // Idempotent: marking an already-contacted team keeps the original
        // author and date rather than rewriting them.
        await StaffTeamContact.query()
          .insert({ teamId: teamAccount.teamId, userId: ctx.auth.user.id })
          .onConflict("teamId")
          .ignore();
      } else {
        await StaffTeamContact.query()
          .delete()
          .where("teamId", teamAccount.teamId);
      }

      ctx.loaders.StaffTeamContactByTeamId.clear(teamAccount.teamId);

      return teamAccount;
    },
  },
};
