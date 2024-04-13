import { invariant } from "@argos/util/invariant";

import { Build } from "@/database/models/Build.js";
import { repoAuth } from "@/web/middlewares/repoAuth.js";
import { boom } from "@/web/util.js";

import { CreateAPIHandler } from "../util.js";

export const getAuthProjectBuilds: CreateAPIHandler = ({ get }) => {
  return get("/project/builds", repoAuth, async (req, res) => {
    if (!req.authProject) {
      throw boom(401, "Unauthorized");
    }

    const { page, perPage, commit } = req.ctx.query;

    const query = Build.query()
      .withGraphFetched("project.account")
      .where("builds.projectId", req.authProject.id)
      .orderBy("builds.id", "desc")
      .page(page - 1, perPage);

    if (commit) {
      // Check if the commit is in the compareScreenshotBucket or prHeadCommit
      query.joinRelated("compareScreenshotBucket").where((qb) => {
        qb.where("compareScreenshotBucket.commit", commit).orWhere(
          "prHeadCommit",
          commit,
        );
      });
    }

    const builds = await query;

    const [statuses, urls] = await Promise.all([
      Build.getAggregatedBuildStatuses(builds.results),
      Promise.all(builds.results.map((build) => build.getUrl())),
    ]);

    res.send({
      results: builds.results.map((build, i) => {
        const status = statuses[i];
        invariant(status, "Status should be fetched for all builds");
        const url = urls[i];
        invariant(url, "URL should be fetched for all builds");
        return {
          id: build.id,
          number: build.number,
          status,
          url,
        };
      }),
      pageInfo: {
        total: builds.total,
        page,
        perPage,
      },
    });
  });
};
