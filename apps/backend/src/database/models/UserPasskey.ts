import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { User } from "./User";

export class UserPasskey extends Model {
  static override tableName = "user_passkeys";

  /**
   * Transports a browser may report for a credential. Unknown values are
   * dropped on the way in (see `src/auth/passkey.ts`): the list is only ever
   * replayed to the browser as a hint, so losing an exotic one is harmless.
   */
  static transports = [
    "ble",
    "cable",
    "hybrid",
    "internal",
    "nfc",
    "smart-card",
    "usb",
  ] as const;

  static deviceTypes = ["singleDevice", "multiDevice"] as const;

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: [
          "userId",
          "credentialId",
          "publicKey",
          "deviceType",
          "backedUp",
          "name",
        ],
        properties: {
          userId: { type: "string" },
          credentialId: { type: "string" },
          publicKey: { type: "string" },
          // A bigint column: Postgres hands it back as a string.
          counter: { type: "string" },
          transports: {
            anyOf: [
              {
                type: "array",
                items: { type: "string", enum: [...UserPasskey.transports] },
              },
              { type: "null" },
            ],
          },
          deviceType: { type: "string", enum: [...UserPasskey.deviceTypes] },
          backedUp: { type: "boolean" },
          aaguid: { type: ["string", "null"] },
          name: { type: "string", minLength: 1, maxLength: 255 },
          lastUsedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  userId!: string;
  /** Base64URL-encoded credential id, unique across every account. */
  credentialId!: string;
  /** Base64URL-encoded COSE public key. */
  publicKey!: string;
  /** Signature counter, for replay detection. Synced providers keep it at 0. */
  counter!: string;
  transports!: (typeof UserPasskey.transports)[number][] | null;
  deviceType!: (typeof UserPasskey.deviceTypes)[number];
  /** Whether the provider backs the credential up (i.e. syncs it). */
  backedUp!: boolean;
  /** Authenticator Attestation GUID: identifies the passkey provider. */
  aaguid!: string | null;
  name!: string;
  lastUsedAt!: string | null;

  static override get jsonAttributes() {
    return ["transports"];
  }

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "user_passkeys.userId",
          to: "users.id",
        },
      },
    };
  }

  user?: User;
}
