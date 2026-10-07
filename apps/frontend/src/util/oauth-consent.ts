import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import { OAuthScopeLevel } from "@/gql/graphql";
import * as storage from "@/util/storage";

/**
 * Scopes the user cannot turn off. `profile` (identity) is always granted so
 * the application knows who authorized it — downgrading it would break every
 * flow.
 */
export const REQUIRED_SCOPES = new Set<string>(["profile"]);

/** From least to most powerful: a preset grants its level and every level before it. */
const LEVELS = [
  OAuthScopeLevel.Read,
  OAuthScopeLevel.Write,
  OAuthScopeLevel.Admin,
];

/** Administration is opted into: an application seen for the first time never starts there. */
const DEFAULT_LEVEL = OAuthScopeLevel.Write;

type RequestedScope = { scope: string; level: OAuthScopeLevel };

export type ConsentPreset = {
  level: OAuthScopeLevel;
  /** Every requested scope up to the level, in the order they were requested. */
  scopes: string[];
};

/**
 * The presets worth offering for a request. A level the application requests
 * no scope of is left out: its preset would grant exactly what the one below
 * it does.
 */
export function getConsentPresets(
  scopes: readonly RequestedScope[],
): ConsentPreset[] {
  return LEVELS.flatMap((level, index) => {
    if (!scopes.some((scope) => scope.level === level)) {
      return [];
    }
    const included = LEVELS.slice(0, index + 1);
    return [
      {
        level,
        scopes: scopes
          .filter((scope) => included.includes(scope.level))
          .map((scope) => scope.scope),
      },
    ];
  });
}

/**
 * The offered preset that grants what `level` would: the most powerful one not
 * above it. A remembered "admin" resolves to "write" for an application that
 * requests no admin scope.
 */
function resolvePreset(
  presets: readonly ConsentPreset[],
  level: OAuthScopeLevel,
): ConsentPreset | null {
  const rank = LEVELS.indexOf(level);
  return (
    presets.findLast((preset) => LEVELS.indexOf(preset.level) <= rank) ?? null
  );
}

export type ConsentAccess = OAuthScopeLevel | "custom";

const ConsentSettingsSchema = z.object({
  access: z.union([z.enum(OAuthScopeLevel), z.literal("custom")]),
  /** The scopes granted; read back only when `access` is "custom". */
  scopes: z.array(z.string()),
  /** "all" rather than the list, so that a team joined later is granted too. */
  accountIds: z.union([z.literal("all"), z.array(z.string())]),
});

/** What the user granted an application last time, remembered in this browser. */
export type ConsentSettings = z.infer<typeof ConsentSettingsSchema>;

/**
 * Remembered per user and per application. A verified application keeps its
 * known id across registrations; any other one is only recognised by its own
 * client, because the name it registered with proves nothing.
 */
export function getConsentStorageKey(input: {
  userId: string;
  client: { clientId: string; knownAppId?: string | null };
}): string {
  const { userId, client } = input;
  return `oauth.consent.${userId}.${client.knownAppId ?? client.clientId}`;
}

export function getRememberedConsent(key: string): ConsentSettings | null {
  const raw = storage.getItem(key);
  if (raw === null) {
    return null;
  }
  try {
    const result = ConsentSettingsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    // Not JSON (e.g. a truncated write): start from the defaults.
    return null;
  }
}

export function rememberConsent(key: string, settings: ConsentSettings) {
  storage.setItem(key, JSON.stringify(settings));
}

export type ConsentValues = {
  access: ConsentAccess;
  /** The scopes ticked under "custom". Required scopes have no checkbox, so they are not in it. */
  customScopes: string[];
  accountIds: string[];
};

/**
 * What the consent screen starts with: the choices remembered for the
 * application, fitted to what it requests and to the accounts the user has
 * today — or the defaults.
 */
export function getInitialConsentValues(input: {
  scopes: readonly RequestedScope[];
  accountIds: readonly string[];
  remembered: ConsentSettings | null;
}): ConsentValues {
  const { scopes, accountIds, remembered } = input;
  const presets = getConsentPresets(scopes);
  const defaultPreset = resolvePreset(presets, DEFAULT_LEVEL) ?? presets[0];
  invariant(defaultPreset, "A consent request must have at least one scope");
  const toggleable = scopes
    .map((scope) => scope.scope)
    .filter((scope) => !REQUIRED_SCOPES.has(scope));

  const preset = (() => {
    if (!remembered || remembered.access === "custom") {
      return defaultPreset;
    }
    return resolvePreset(presets, remembered.access) ?? defaultPreset;
  })();
  const custom = remembered?.access === "custom" && toggleable.length > 0;

  const rememberedAccountIds = remembered?.accountIds ?? "all";
  const keptAccountIds =
    rememberedAccountIds === "all"
      ? accountIds
      : accountIds.filter((id) => rememberedAccountIds.includes(id));

  return {
    access: custom ? "custom" : preset.level,
    customScopes: custom
      ? toggleable.filter((scope) => remembered.scopes.includes(scope))
      : preset.scopes.filter((scope) => !REQUIRED_SCOPES.has(scope)),
    // Every remembered account is gone: start over from all of them.
    accountIds: [...(keptAccountIds.length > 0 ? keptAccountIds : accountIds)],
  };
}

/** The scopes a choice grants, in the order the application requested them. */
export function getGrantedScopes(input: {
  scopes: readonly RequestedScope[];
  access: ConsentAccess;
  customScopes: readonly string[];
}): string[] {
  const { scopes, access, customScopes } = input;
  if (access === "custom") {
    return scopes
      .map((scope) => scope.scope)
      .filter(
        (scope) => REQUIRED_SCOPES.has(scope) || customScopes.includes(scope),
      );
  }
  const preset = getConsentPresets(scopes).find(
    (preset) => preset.level === access,
  );
  invariant(preset, `No preset is offered for the "${access}" level`);
  return preset.scopes;
}
