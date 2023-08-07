import { Router, json } from "express";

import { transaction } from "@argos-ci/database";
import {
  VercelCheck,
  VercelConfiguration,
  VercelDeployment,
  VercelProject,
  VercelProjectConfiguration,
} from "@argos-ci/database/models";
import { createVercelClient } from "@argos-ci/vercel";

import { createBuild, createCrawl } from "./api/v2/util.js";
import { asyncHandler } from "./util.js";

const router = Router();

router.post(
  "/vercel/event-handler",
  json(),
  asyncHandler(async (req, res) => {
    const { type, payload } = req.body;
    switch (type) {
      // Projects & account synchronization
      case "integration-configuration.removed": {
        await VercelConfiguration.query().patch({ deleted: true }).where({
          vercelId: payload.configuration.id,
        });
        break;
      }
      case "project.removed": {
        const [configuration, removedProject] = await Promise.all([
          VercelConfiguration.query().findOne({
            vercelTeamId: payload.team.id,
            deleted: false,
          }),
          VercelProject.query().findOne("vercelId", payload.project.id),
        ]);
        if (!configuration || !removedProject) break;
        await VercelProjectConfiguration.query()
          .where({
            vercelConfigurationId: configuration.id,
            vercelProjectId: removedProject.id,
          })
          .delete();
        break;
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
                payload.configuration.id,
              ),
              payload.projects.removed.length > 0
                ? VercelProject.query().whereIn(
                    "vercelId",
                    payload.projects.removed,
                  )
                : [],
              payload.projects.added.length > 0
                ? VercelProject.query().whereIn(
                    "vercelId",
                    payload.projects.added,
                  )
                : [],
            ]);
          if (!configuration) break;

          await transaction(async (trx) => {
            await Promise.all([
              removedProjects.length > 0
                ? VercelProjectConfiguration.query(trx)
                    .where("vercelConfigurationId", configuration.id)
                    .whereIn(
                      "vercelProjectId",
                      removedProjects.map((p) => p.id),
                    )
                    .delete()
                : null,
              ...addedProjects.map(async (project) => {
                const existing = await VercelProjectConfiguration.query(
                  trx,
                ).findOne({
                  vercelConfigurationId: configuration.id,
                  vercelProjectId: project.id,
                });
                if (existing) return;
                await VercelProjectConfiguration.query(trx).insert({
                  vercelConfigurationId: configuration.id,
                  vercelProjectId: project.id,
                });
              }),
            ]);
          });
        }
        break;
      }

      // Checks
      case "deployment.created": {
        // Only handle GitHub based deployments
        if (
          !payload.deployment.meta?.githubCommitRef ||
          !payload.deployment.meta?.githubCommitSha
        ) {
          break;
        }

        const vercelProject = await VercelProject.query()
          .findOne("vercelId", payload.project.id)
          .withGraphFetched("[activeConfiguration, project]");

        // If no project, no active configuration or not linked to an Argos project, stop here
        if (
          !vercelProject?.activeConfiguration?.vercelAccessToken ||
          !vercelProject?.project
        ) {
          break;
        }

        const client = createVercelClient({
          accessToken: vercelProject.activeConfiguration.vercelAccessToken,
        });

        const deployment = await (async () => {
          const existing = await VercelDeployment.query().findOne({
            vercelId: payload.deployment.id,
          });
          if (existing) return existing;
          return VercelDeployment.query().insertAndFetch({
            url: payload.deployment.url,
            vercelId: payload.deployment.id,
            vercelProjectId: vercelProject.id,
            githubCommitRef: payload.deployment.meta?.githubCommitRef || null,
            githubCommitSha: payload.deployment.meta?.githubCommitSha || null,
            githubPrId: payload.deployment.meta?.githubPrId || null,
          });
        })();

        const result = await client.createCheck({
          deploymentId: payload.deployment.id,
          teamId: vercelProject.activeConfiguration.vercelTeamId,
          blocking: true,
          name: "Argos",
        });

        await VercelCheck.query().insert({
          vercelId: result.id,
          vercelDeploymentId: deployment.id,
        });
        break;
      }
      case "deployment.ready": {
        const deployment = await VercelDeployment.query()
          .findOne({
            vercelId: payload.deployment.id,
          })
          .withGraphFetched(
            "[vercelCheck,vercelProject.[activeConfiguration,project.account]]",
          );

        if (
          !deployment?.vercelCheck ||
          !deployment?.vercelProject?.project?.account ||
          !deployment?.vercelProject?.activeConfiguration?.vercelAccessToken ||
          !deployment.githubCommitRef ||
          !deployment.githubCommitSha
        ) {
          break;
        }

        const client = createVercelClient({
          accessToken:
            deployment.vercelProject.activeConfiguration.vercelAccessToken,
        });

        try {
          const build = await createBuild({
            branch: deployment.githubCommitRef,
            commit: deployment.githubCommitSha,
            prNumber: deployment.githubPrId
              ? Number(deployment.githubPrId)
              : null,
            project: deployment.vercelProject.project,
            buildName: "vercel",
          });

          await createCrawl({
            build,
            baseUrl: `https://${deployment.url}`,
          });

          await VercelCheck.query().findById(deployment.id).patch({
            buildId: build.id,
          });
        } catch (error: any) {
          if (error.statusCode === 402) {
            await client.updateCheck({
              deploymentId: deployment.vercelId,
              teamId: deployment.vercelProject.activeConfiguration.vercelTeamId,
              checkId: deployment.vercelCheck.vercelId,
              status: "completed",
              conclusion: "failed",
              name: `Argos — ${error.message}`,
            });
          } else {
            throw error;
          }
        }
        break;
      }
    }
    res.send("OK");
  }),
);

export const middleware = router;
