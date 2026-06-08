import express, { Router } from "express";

import {
  listActiveSessions,
  revokeAllSessions,
  revokeSession,
} from "@/auth/session";
import { sessionAuthFromExpressReq } from "@/auth/session-request";
import { boom } from "@/util/error";

import { allowApp } from "../middlewares/cors";
import { requireCsrf } from "../middlewares/csrf";
import { asyncHandler } from "../util";

const router: Router = Router();

// CORS (and preflight) for every session route. Applied via `use` so the
// OPTIONS preflight for the cross-origin DELETE/POST is handled.
router.use("/auth/sessions", allowApp);

/**
 * List the current user's active sessions, flagging the one backing this
 * request. Backs a future session-management UI. Read-only, so no CSRF.
 */
router.get(
  "/auth/sessions",
  asyncHandler(async (req, res) => {
    const auth = await sessionAuthFromExpressReq(req);
    const sessions = await listActiveSessions(auth.user.id);
    res.send({
      sessions: sessions.map((session) => ({
        id: session.id,
        current: session.id === auth.sessionId,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        ip: session.ip,
        deviceLabel: session.deviceLabel,
      })),
    });
  }),
);

/**
 * Revoke a single session owned by the current user.
 */
router.delete(
  "/auth/sessions/:id",
  requireCsrf,
  asyncHandler(async (req, res) => {
    const auth = await sessionAuthFromExpressReq(req);
    const sessionId = req.params["id"];
    if (typeof sessionId !== "string") {
      throw boom(400, "Missing session id");
    }
    await revokeSession({ sessionId, userId: auth.user.id });
    res.sendStatus(204);
  }),
);

/**
 * Revoke all of the current user's sessions except the one in use.
 */
router.post(
  "/auth/sessions/revoke-all",
  requireCsrf,
  express.json(),
  asyncHandler(async (req, res) => {
    const auth = await sessionAuthFromExpressReq(req);
    await revokeAllSessions({
      userId: auth.user.id,
      exceptSessionId: auth.sessionId,
    });
    res.sendStatus(204);
  }),
);

export default router;
