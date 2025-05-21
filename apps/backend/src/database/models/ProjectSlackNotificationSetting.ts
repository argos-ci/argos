import type { RelationMappings } from 'objection';
import { Model } from '../util/model.js';
import { mergeSchemas, timestampsSchema } from '../util/schemas.js';
import { Project } from './Project.js';
import { SlackInstallation } from './SlackInstallation.js';

export class ProjectSlackNotificationSetting extends Model {
  static override tableName = 'project_slack_notification_settings';

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: [
      'projectId',
      'slackInstallationId',
      'channelId',
      'notificationType',
    ],
    properties: {
      id: { type: 'string' },
      projectId: { type: 'string' },
      slackInstallationId: { type: 'string' },
      channelId: { type: 'string' },
      notificationType: {
        type: 'string',
        enum: ['all_changes', 'reference_changes'],
        default: 'all_changes',
      },
    },
  });

  projectId!: string;
  slackInstallationId!: string;
  channelId!: string;
  notificationType!: 'all_changes' | 'reference_changes';

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: 'project_slack_notification_settings.projectId',
          to: 'projects.id',
        },
      },
      slackInstallation: {
        relation: Model.BelongsToOneRelation,
        modelClass: SlackInstallation,
        join: {
          from: 'project_slack_notification_settings.slackInstallationId',
          to: 'slack_installations.id',
        },
      },
    };
  }

  project?: Project;
  slackInstallation?: SlackInstallation;
}
