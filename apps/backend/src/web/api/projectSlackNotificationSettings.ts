import { Router, Request, Response, NextFunction } from 'express';
import { ProjectSlackNotificationSetting, Project } from '../../database/models/index.js';
import { auth } from '../../middlewares/auth.js'; // Import the actual auth middleware
import type { AuthPayload } from '../../../auth/request.js'; // Import AuthPayload type

// Authorization logic
const authorizeProjectAccess = async (
  authPayload: AuthPayload | null | undefined,
  projectId: string,
): Promise<boolean> => {
  if (!authPayload?.account) {
    return false; // No authenticated account
  }
  const project = await Project.query().findById(projectId).first();
  if (!project) {
    return false; // Project not found
  }
  return project.accountId === authPayload.account.id;
};

const authorizeSettingAccess = async (
  authPayload: AuthPayload | null | undefined,
  settingId: string,
): Promise<boolean> => {
  if (!authPayload?.account) {
    return false; // No authenticated account
  }
  const setting = await ProjectSlackNotificationSetting.query()
    .findById(settingId)
    .withGraphFetched('project')
    .first();

  if (!setting?.project) {
    return false; // Setting or associated project not found
  }
  // Delegate to project access check
  return authorizeProjectAccess(authPayload, setting.project.id);
};

// Note: The placeholder 'db' object and 'ProjectSlackNotificationSetting' interface
// are removed as we are now using the actual Objection.js model.

const router = Router();

// --- Interface definitions for request validation ---
interface CreateSettingBody {
  projectId: string;
  slackInstallationId: string;
  channelId: string;
  notificationType?: 'all_changes' | 'reference_changes';
}

interface UpdateSettingBody {
  notificationType: 'all_changes' | 'reference_changes';
}

// --- Route Handlers ---

// Create a new Slack notification setting
router.post(
  '/project-slack-notification-settings',
  auth, // Use actual auth middleware
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        projectId,
        slackInstallationId,
        channelId,
        notificationType = 'all_changes',
      } = req.body as CreateSettingBody;

      // Basic Input Validation
      if (!projectId || !slackInstallationId || !channelId) {
        return res.status(400).json({
          error: 'Missing required fields: projectId, slackInstallationId, channelId',
        });
      }
      if (notificationType && !['all_changes', 'reference_changes'].includes(notificationType)) {
        return res.status(400).json({ error: 'Invalid notificationType' });
      }

      if (!req.auth?.account) {
        // Should be caught by auth middleware, but good for belt-and-suspenders
        return res.status(401).json({ error: 'Unauthorized: No valid account found in session' });
      }

      // Authorization
      const canAccessProject = await authorizeProjectAccess(req.auth, projectId);
      if (!canAccessProject) {
        return res.status(403).json({ error: 'Forbidden: Project access denied' });
      }
      // TODO: Add authorization for slackInstallationId if necessary.
      // This might involve fetching the SlackInstallation and checking its associated account.
      // For now, we assume if the user has access to the project, they can link a slack installation.

      const newSetting = await ProjectSlackNotificationSetting.query().insert({
        projectId,
        slackInstallationId,
        channelId,
        notificationType,
      });
      res.status(201).json(newSetting);
    } catch (error) {
      next(error);
    }
  },
);

// List settings for a project
router.get(
  '/project-slack-notification-settings/project/:projectId',
  auth, // Use actual auth middleware
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;

      if (!req.auth?.account) {
        return res.status(401).json({ error: 'Unauthorized: No valid account found in session' });
      }

      // Authorization
      const canAccess = await authorizeProjectAccess(req.auth, projectId);
      if (!canAccess) {
        return res.status(403).json({ error: 'Forbidden: Cannot access settings for this project' });
      }

      const settings = await ProjectSlackNotificationSetting.query().where({ projectId });
      res.status(200).json(settings);
    } catch (error) {
      next(error);
    }
  },
);

// Update a setting
router.patch(
  '/project-slack-notification-settings/:settingId',
  auth, // Use actual auth middleware
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { settingId } = req.params;
      const { notificationType } = req.body as UpdateSettingBody;

      if (!notificationType || !['all_changes', 'reference_changes'].includes(notificationType)) {
        return res.status(400).json({ error: 'Invalid or missing notificationType' });
      }

      if (!req.auth?.account) {
        return res.status(401).json({ error: 'Unauthorized: No valid account found in session' });
      }

      // Authorization: Check if the setting belongs to the user's account
      const canAccess = await authorizeSettingAccess(req.auth, settingId);
      if (!canAccess) {
         return res.status(403).json({ error: 'Forbidden: Cannot access this setting' });
      }

      // Optional: Check if setting exists before update
      // const existingSetting = await db.getProjectSlackNotificationSettingById(settingId);
      // if (!existingSetting) {
      //   return res.status(404).json({ error: 'Setting not found' });
      // }

      // It's good practice to ensure the setting exists before patching,
      // or handle the case where patchAndFetchById returns undefined.
      const updatedSetting = await ProjectSlackNotificationSetting.query().patchAndFetchById(
        settingId,
        {
          notificationType,
          // Automatically update `updatedAt` if your Model base class doesn't handle it
          // updatedAt: new Date().toISOString(), 
        },
      );

      if (!updatedSetting) {
        return res.status(404).json({ error: 'Setting not found or update failed' });
      }
      res.status(200).json(updatedSetting);
    } catch (error) {
      next(error);
    }
  },
);

// Delete a setting
router.delete(
  '/project-slack-notification-settings/:settingId',
  auth, // Use actual auth middleware
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { settingId } = req.params;

      if (!req.auth?.account) {
        return res.status(401).json({ error: 'Unauthorized: No valid account found in session' });
      }

      // Authorization
      const canAccess = await authorizeSettingAccess(req.auth, settingId);
      if (!canAccess) {
        return res.status(403).json({ error: 'Forbidden: Cannot access this setting' });
      }

      // Optional: Check if setting exists before delete
      // const existingSetting = await db.getProjectSlackNotificationSettingById(settingId);
      // if (!existingSetting) {
      //   return res.status(404).json({ error: 'Setting not found' });
      // }

      const numDeleted = await ProjectSlackNotificationSetting.query().deleteById(settingId);

      if (numDeleted === 0) {
        return res.status(404).json({ error: 'Setting not found or delete failed' });
      }
      res.status(204).send(); // No content
    } catch (error) {
      next(error);
    }
  },
);

export default router;
