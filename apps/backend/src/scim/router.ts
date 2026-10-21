/**
 * SCIM 2.0 (RFC 7643, RFC 7644) provisioning API, served at
 * `https://api.argos-ci.com/scim/v2`. A team's Identity Provider authenticates
 * with the team's SCIM token and manages its members as `Users`.
 */
import { invariant } from "@argos/util/invariant";
import express, {
  Router,
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

import { safeParseBearerFromHeader } from "@/auth/auth-header";
import config from "@/config";
import type { Team, TeamScimToken } from "@/database/models";
import logger from "@/logger";
import { createRedisStore } from "@/util/rate-limit";
import { asyncHandler } from "@/web/util";

import { ScimError } from "./error";
import { parseUserFilter } from "./filter";
import { applyPatch, parsePatchOperations } from "./patch";
import {
  authorizeScimToken,
  createScimUser,
  deleteScimUser,
  findScimToken,
  getScimUser,
  listScimUsers,
  updateScimUser,
} from "./service";
import {
  getScimBaseUrl,
  parseUserInput,
  SCIM_SCHEMAS,
  serializeUser,
} from "./user";

const MAX_RESULTS = 100;

function sendScim(res: Response, status: number, body: unknown) {
  res.status(status).type("application/scim+json").send(JSON.stringify(body));
}

function sendList(
  res: Response,
  resources: unknown[],
  page: { totalResults?: number; startIndex?: number } = {},
) {
  sendScim(res, 200, {
    schemas: [SCIM_SCHEMAS.listResponse],
    totalResults: page.totalResults ?? resources.length,
    startIndex: page.startIndex ?? 1,
    itemsPerPage: resources.length,
    Resources: resources,
  });
}

function getQueryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getQueryInteger(value: unknown): number | undefined {
  const string = getQueryString(value);
  if (string === undefined) {
    return undefined;
  }
  const integer = Number.parseInt(string, 10);
  return Number.isNaN(integer) ? undefined : integer;
}

function getId(req: Request): string {
  const id = req.params["id"];
  invariant(typeof id === "string", "Missing id param");
  return id;
}

type ScimCaller = { scimToken: TeamScimToken } | { error: ScimError };

const callers = new WeakMap<Request, ScimCaller>();
const teams = new WeakMap<Request, Team>();

async function resolveCaller(req: Request): Promise<ScimCaller> {
  const token = safeParseBearerFromHeader(req.get("authorization") ?? "");
  if (!token) {
    return { error: new ScimError(401, "A bearer token is required.") };
  }
  const scimToken = await findScimToken(token);
  if (!scimToken) {
    return { error: new ScimError(401, "Invalid SCIM token.") };
  }
  return { scimToken };
}

function getCaller(req: Request): ScimCaller {
  const caller = callers.get(req);
  invariant(caller, "SCIM caller not identified");
  return caller;
}

function getTeam(req: Request): Team {
  const team = teams.get(req);
  invariant(team, "SCIM caller not authorized");
  return team;
}

/**
 * Identify the token before rate-limiting, so the budget is per team: Entra ID
 * provisions every tenant from the same pool of addresses. The rest of the
 * authorization waits behind the limiter.
 */
const identifyCaller = asyncHandler(async (req, _res, next) => {
  callers.set(req, await resolveCaller(req));
  next();
});

function tooManyRequests(_req: Request, _res: Response, next: NextFunction) {
  next(new ScimError(429, "Too many requests."));
}

/**
 * Counts rejected tokens only, per address, ahead of the token lookup: a client
 * guessing tokens is stopped before it reaches the database, while an Identity
 * Provider with a valid token never spends this budget.
 */
const authFailureLimiter = rateLimit({
  windowMs: config.get("api.rateLimit.window"),
  limit: () => config.get("api.rateLimit.limit"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("scim-auth"),
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode !== 401,
  handler: tooManyRequests,
});

const limiter = rateLimit({
  windowMs: config.get("api.rateLimit.window"),
  limit: () => config.get("api.rateLimit.scimLimit"),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: createRedisStore("scim"),
  keyGenerator: (req) => {
    const caller = getCaller(req);
    if ("scimToken" in caller) {
      return `team:${caller.scimToken.teamId}`;
    }
    invariant(req.ip, "SCIM request without a remote address");
    return ipKeyGenerator(req.ip);
  },
  handler: tooManyRequests,
});

const requireTeam: RequestHandler = asyncHandler(async (req, _res, next) => {
  const caller = getCaller(req);
  if ("error" in caller) {
    throw caller.error;
  }
  teams.set(req, await authorizeScimToken(caller.scimToken));
  next();
});

const router: Router = Router();

router.use(
  express.json({ type: ["application/json", "application/scim+json"] }),
);

// The discovery endpoints describe the service, not a team: they are public.
router.get("/ServiceProviderConfig", (_req, res) => {
  sendScim(res, 200, {
    schemas: [SCIM_SCHEMAS.serviceProviderConfig],
    documentationUri:
      "https://argos-ci.com/docs/learn/account-and-access/scim-provisioning",
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: MAX_RESULTS },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: "oauthbearertoken",
        name: "Bearer token",
        description:
          "The SCIM token generated in the Authentication settings of the team.",
        primary: true,
      },
    ],
    meta: {
      resourceType: "ServiceProviderConfig",
      location: `${getScimBaseUrl()}/ServiceProviderConfig`,
    },
  });
});

router.get("/ResourceTypes", (_req, res) => {
  sendList(res, [
    {
      schemas: [SCIM_SCHEMAS.resourceType],
      id: "User",
      name: "User",
      endpoint: "/Users",
      schema: SCIM_SCHEMAS.user,
      meta: {
        resourceType: "ResourceType",
        location: `${getScimBaseUrl()}/ResourceTypes/User`,
      },
    },
  ]);
});

function attribute(name: string, type: string, extra?: object) {
  return {
    name,
    type,
    multiValued: false,
    required: false,
    mutability: "readWrite",
    returned: "default",
    ...extra,
  };
}

function stringAttribute(name: string) {
  return attribute(name, "string", { caseExact: false, uniqueness: "none" });
}

router.get("/Schemas", (_req, res) => {
  sendList(res, [
    {
      schemas: [SCIM_SCHEMAS.schema],
      id: SCIM_SCHEMAS.user,
      name: "User",
      description: "A member of the team",
      attributes: [
        {
          ...stringAttribute("userName"),
          required: true,
          uniqueness: "server",
        },
        attribute("name", "complex", {
          subAttributes: [
            stringAttribute("givenName"),
            stringAttribute("familyName"),
          ],
        }),
        stringAttribute("displayName"),
        attribute("emails", "complex", {
          multiValued: true,
          subAttributes: [
            stringAttribute("value"),
            stringAttribute("type"),
            attribute("primary", "boolean"),
          ],
        }),
        attribute("active", "boolean"),
        attribute("roles", "complex", {
          multiValued: true,
          description:
            "The level of the member in the team: owner, member or contributor. Without a role, the member's level is left as it is.",
          subAttributes: [
            stringAttribute("value"),
            attribute("primary", "boolean"),
          ],
        }),
      ],
      meta: {
        resourceType: "Schema",
        location: `${getScimBaseUrl()}/Schemas/${SCIM_SCHEMAS.user}`,
      },
    },
  ]);
});

router.use(authFailureLimiter, identifyCaller, limiter, requireTeam);

router.get(
  "/Users",
  asyncHandler(async (req, res) => {
    const filter = getQueryString(req.query["filter"]);
    const startIndex = Math.max(
      1,
      getQueryInteger(req.query["startIndex"]) ?? 1,
    );
    const count = Math.min(
      MAX_RESULTS,
      Math.max(0, getQueryInteger(req.query["count"]) ?? MAX_RESULTS),
    );
    const { totalResults, users } = await listScimUsers({
      teamId: getTeam(req).id,
      filter: filter ? parseUserFilter(filter) : null,
      startIndex,
      count,
    });
    sendList(res, users.map(serializeUser), { totalResults, startIndex });
  }),
);

router.post(
  "/Users",
  asyncHandler(async (req, res) => {
    const scimUser = await createScimUser({
      team: getTeam(req),
      attributes: parseUserInput(req.body, true),
    });
    const resource = serializeUser(scimUser);
    res.location(resource.meta.location);
    sendScim(res, 201, resource);
  }),
);

router.get(
  "/Users/:id",
  asyncHandler(async (req, res) => {
    const scimUser = await getScimUser({
      teamId: getTeam(req).id,
      id: getId(req),
    });
    sendScim(res, 200, serializeUser(scimUser));
  }),
);

router.put(
  "/Users/:id",
  asyncHandler(async (req, res) => {
    const scimUser = await updateScimUser({
      team: getTeam(req),
      id: getId(req),
      update: (current) => parseUserInput(req.body, current.active),
    });
    sendScim(res, 200, serializeUser(scimUser));
  }),
);

router.patch(
  "/Users/:id",
  asyncHandler(async (req, res) => {
    const operations = parsePatchOperations(req.body);
    const scimUser = await updateScimUser({
      team: getTeam(req),
      id: getId(req),
      update: (current) => applyPatch(current, operations),
    });
    sendScim(res, 200, serializeUser(scimUser));
  }),
);

router.delete(
  "/Users/:id",
  asyncHandler(async (req, res) => {
    await deleteScimUser({ team: getTeam(req), id: getId(req) });
    res.status(204).end();
  }),
);

router.use((_req, _res, next) => {
  next(new ScimError(404, "Resource not found."));
});

function getStatusCode(error: unknown): number {
  return error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
    ? error.statusCode
    : 500;
}

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (res.headersSent) {
    return;
  }
  const status = getStatusCode(error);
  if (status >= 500) {
    logger.error({
      error,
      reportToSentry: false, // There is already a middleware handling this
    });
  }
  if (status === 401) {
    res.set("WWW-Authenticate", 'Bearer realm="Argos SCIM"');
  }
  sendScim(res, status, {
    schemas: [SCIM_SCHEMAS.error],
    status: String(status),
    scimType: error instanceof ScimError ? error.scimType : undefined,
    detail:
      status >= 500 || !(error instanceof Error)
        ? "Internal server error."
        : error.message,
  });
};

router.use(errorHandler);

export default router;
