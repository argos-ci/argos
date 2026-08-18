import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { OriginRepository } from "./OriginRepository";

/**
 * An installation of the Argos app into a Cursor Origin namespace.
 *
 * Mirrors {@link GithubInstallation}: Origin apps follow the GitHub App model,
 * an app is installed into an owner and mints short-lived installation tokens.
 * The token is cached here between calls, like `githubToken`.
 */
export class OriginInstallation extends Model {
  static override tableName = "origin_installations";

  static override encryptedAttributes = ["token"];

  static override get jsonAttributes() {
    return ["scopes"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["originId", "targetSlug", "targetId"],
        properties: {
          originId: { type: "string" },
          targetSlug: { type: "string" },
          targetId: { type: "string" },
          repoSelectionMode: { type: "string", enum: ["all", "selected"] },
          scopes: { type: "array", items: { type: "string" } },
          deleted: { type: "boolean" },
          token: { type: ["string", "null"] },
          tokenExpiresAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  /**
   * The installation ID on Origin (`i_…`), used to mint installation tokens.
   */
  originId!: string;

  /**
   * The owner (namespace) the app is installed into: its URL slug…
   */
  targetSlug!: string;

  /**
   * …and its stable Origin ID (`ns_…`).
   */
  targetId!: string;

  /**
   * Whether the installation reaches every repository of the owner or only the
   * ones the workspace admin selected.
   */
  repoSelectionMode!: "all" | "selected";

  /**
   * Scopes approved by the workspace admin. Without
   * `repository:contents:read`, Argos cannot compute merge bases itself and
   * relies on what the CLI sends, like the GitHub `light` app.
   */
  scopes!: string[];

  /**
   * Whether the app has been uninstalled from the namespace.
   */
  deleted!: boolean;

  /**
   * The cached installation access token (`oit_…`).
   */
  token!: string | null;

  /**
   * The expiration date of the cached token, at most 15 minutes after minting.
   */
  tokenExpiresAt!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      repositories: {
        relation: Model.HasManyRelation,
        modelClass: OriginRepository,
        join: {
          from: "origin_installations.id",
          to: "origin_repositories.originInstallationId",
        },
      },
    };
  }

  repositories?: OriginRepository[];

  /**
   * Whether the workspace admin granted the scope. `repository:metadata:read`
   * is always granted and never listed.
   */
  hasScope(scope: string): boolean {
    return this.scopes.includes(scope);
  }
}
