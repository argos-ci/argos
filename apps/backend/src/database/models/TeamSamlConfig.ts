import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account } from "./Account";

export class TeamSamlConfig extends Model {
  static override tableName = "team_saml_configs";

  static override get jsonAttributes() {
    return ["signingCertificate", "domainAllowlist"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["accountId", "idpEntityId", "ssoUrl", "signingCertificate"],
        properties: {
          accountId: { type: "string" },
          idpEntityId: { type: "string" },
          ssoUrl: { type: "string" },
          signingCertificate: { type: "string" },
          enabled: { type: "boolean" },
          enforced: { type: "boolean" },
          enforcedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  accountId!: string;
  idpEntityId!: string;
  ssoUrl!: string;
  signingCertificate!: string;
  enabled!: boolean;
  enforced!: boolean;
  enforcedAt!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "team_saml_configs.accountId",
          to: "accounts.id",
        },
      },
    };
  }

  account?: Account;
}
