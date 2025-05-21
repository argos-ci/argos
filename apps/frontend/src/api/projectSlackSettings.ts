// Assuming a global fetch wrapper that handles authentication and base URL
// For example: import { authenticatedFetch } from './auth';

export interface ProjectSlackNotificationSetting {
  id: string;
  projectId: string;
  slackInstallationId: string; // This might be needed if you allow selecting from multiple installations
  channelId: string;
  notificationType: 'all_changes' | 'reference_changes';
  createdAt: string; // Assuming ISO string date
  updatedAt: string; // Assuming ISO string date
}

export interface CreateSettingBody {
  projectId: string;
  slackInstallationId: string; // For now, let's assume we have a way to get this.
                               // In a real app, this might come from a selection or account settings.
  channelId: string;
  notificationType?: 'all_changes' | 'reference_changes';
}

export interface UpdateSettingBody {
  notificationType: 'all_changes' | 'reference_changes';
}

const API_BASE_URL = '/api'; // Adjust if your API is hosted elsewhere or proxied differently

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
  }
  if (response.status === 204) { // No Content
    return null as T;
  }
  return response.json();
}

export async function fetchProjectSlackSettings(projectId: string): Promise<ProjectSlackNotificationSetting[]> {
  const response = await fetch(`${API_BASE_URL}/project-slack-notification-settings/project/${projectId}`);
  return handleResponse<ProjectSlackNotificationSetting[]>(response);
}

export async function createProjectSlackSetting(data: CreateSettingBody): Promise<ProjectSlackNotificationSetting> {
  const response = await fetch(`${API_BASE_URL}/project-slack-notification-settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<ProjectSlackNotificationSetting>(response);
}

export async function updateProjectSlackSetting(
  settingId: string,
  data: UpdateSettingBody,
): Promise<ProjectSlackNotificationSetting> {
  const response = await fetch(`${API_BASE_URL}/project-slack-notification-settings/${settingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<ProjectSlackNotificationSetting>(response);
}

export async function deleteProjectSlackSetting(settingId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/project-slack-notification-settings/${settingId}`, {
    method: 'DELETE',
  });
  await handleResponse<void>(response); // handleResponse will throw if not ok
}
