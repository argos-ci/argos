import { Router, json } from "express";

import {
  VercelConfiguration,
  VercelProject,
  VercelProjectConfiguration,
} from "@argos-ci/database/models";

import { asyncHandler } from "./util.js";

const router = Router();

router.post(
  "/vercel/event-handler",
  json(),
  asyncHandler(async (req, res) => {
    const { type, payload } = req.body;
    switch (type) {
      case "integration-configuration.removed": {
        await VercelConfiguration.query().patch({ deleted: true }).where({
          vercelId: payload.configuration.id,
        });
        return;
      }
      case "project.removed": {
        const [configuration, removedProject] = await Promise.all([
          VercelConfiguration.query().findOne({
            vercelTeamId: payload.team.id,
            deleted: false,
          }),
          VercelProject.query().findOne("vercelId", payload.project.id),
        ]);
        if (!configuration || !removedProject) return;
        await VercelProjectConfiguration.query()
          .where({
            vercelConfigurationId: configuration.id,
            vercelProjectId: removedProject.id,
          })
          .delete();
        return;
      }
      case "integration-configuration.permission-upgraded": {
        // If the permissions are reduced, we have to check if a project is concerned
        if (
          payload.projects.removed.length > 0 ||
          payload.projects.added.length > 0
        ) {
          const [configuration, removedProjects, addedProjects] =
            await Promise.all([
              VercelConfiguration.query().findOne(
                "vercelId",
                payload.configuration.id
              ),
              payload.projects.removed.length > 0
                ? VercelProject.query().whereIn(
                    "vercelId",
                    payload.projects.removed
                  )
                : [],
              payload.projects.added.length > 0
                ? VercelProject.query().whereIn(
                    "vercelId",
                    payload.projects.added
                  )
                : [],
            ]);
          if (!configuration) return;

          await Promise.all([
            removedProjects.length > 0
              ? VercelProjectConfiguration.query()
                  .where("vercelConfigurationId", configuration.id)
                  .whereIn(
                    "vercelProjectId",
                    removedProjects.map((p) => p.id)
                  )
                  .delete()
              : null,
            ...addedProjects.map(async (project) => {
              const existing = await VercelProjectConfiguration.query().findOne(
                {
                  vercelConfigurationId: configuration.id,
                  vercelProjectId: project.id,
                }
              );
              if (existing) return;
              await VercelProjectConfiguration.query().insert({
                vercelConfigurationId: configuration.id,
                vercelProjectId: project.id,
              });
            }),
          ]);
          return;
        }
      }
    }
    res.send("OK");
  })
);

export const middleware = router;
