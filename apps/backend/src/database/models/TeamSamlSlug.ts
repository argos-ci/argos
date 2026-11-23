import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";

/**
 * A team slug that served as a team's SAML service provider identity: the
 * entity ID, ACS and login URLs are built from it, and the team's IdP keeps
 * trusting them after the team is renamed or deleted. The slug stays bound to
 * that team, so no other team can receive those assertions by taking it.
 */
export class TeamSamlSlug extends Model {
  static override tableName = "team_saml_slugs";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["slug", "teamId"],
        properties: {
          slug: { type: "string", minLength: 1, maxLength: 255 },
          teamId: { type: "string" },
        },
      },
    ],
  };

  slug!: string;
  teamId!: string;
}
