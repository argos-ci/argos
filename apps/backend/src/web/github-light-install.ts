import { Router } from "express";
import { z } from "zod";

import { safeSessionAuthFromExpressReq } from "@/auth/session-request";
import config from "@/config";
import { Account } from "@/database/models";
import { signGithubLightInstallState } from "@/github/light-install-state";
import { boom } from "@/util/error";

import { asyncHandler } from "./util";

const QuerySchema = z.object({
  accountId: z.string().regex(/^\d+$/),
});

const router: Router = Router();

/**
 * Send an account admin to GitHub to install the light app, with the signed
 * state the setup URL needs to link the installation to that account. The
 * state is issued on click rather than with the page, so it cannot expire
 * while the page stays open.
 */
router.get(
  "/auth/github-light/install",
  asyncHandler(async (req, res) => {
    const query = QuerySchema.safeParse(req.query);
    if (!query.success) {
      throw boom(400, "Invalid query parameters");
    }

    const auth = await safeSessionAuthFromExpressReq(req);
    if (!auth) {
      const requestUrl = new URL(req.originalUrl, config.get("server.url"));
      const loginUrl = new URL("/login", config.get("server.url"));
      loginUrl.searchParams.set("r", requestUrl.toString());
      res.redirect(loginUrl.toString());
      return;
    }

    const account = await Account.query().findById(query.data.accountId);
    const permissions = account ? await account.$getPermissions(auth) : [];
    if (!account || !permissions.includes("admin")) {
      throw boom(404, "Account not found");
    }

    const appUrl = new URL(config.get("githubLight.appUrl"));
    // /installations/new lets you manage an app already installed too.
    const url = new URL(`${appUrl.pathname}/installations/new`, appUrl.origin);
    url.searchParams.set(
      "state",
      signGithubLightInstallState({ accountId: account.id }),
    );
    res.set("Cache-Control", "no-store");
    res.redirect(url.toString());
  }),
);

export default router;
