import React, { useState, useEffect, FormEvent } from 'react';
import {
  fetchProjectSlackSettings,
  createProjectSlackSetting,
  updateProjectSlackSetting,
  deleteProjectSlackSetting,
  ProjectSlackNotificationSetting,
  CreateSettingBody,
  UpdateSettingBody,
} from '../../api/projectSlackSettings'; // Adjust path as needed

interface ProjectSlackSettingsProps {
  projectId: string;
  // In a real app, this might come from project data or a selection UI
  // For now, we'll assume it's provided if the project has a Slack integration.
  activeSlackInstallationId: string | null; 
}

const ProjectSlackSettings: React.FC<ProjectSlackSettingsProps> = ({ projectId, activeSlackInstallationId }) => {
  const [settings, setSettings] = useState<ProjectSlackNotificationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form/Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ProjectSlackNotificationSetting | null>(null);
  const [channelIdInput, setChannelIdInput] = useState('');
  const [notificationTypeInput, setNotificationTypeInput] = useState<'all_changes' | 'reference_changes'>('all_changes');

  useEffect(() => {
    if (projectId) {
      loadSettings();
    }
  }, [projectId]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSettings = await fetchProjectSlackSettings(projectId);
      setSettings(fetchedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModalToAdd = () => {
    if (!activeSlackInstallationId) {
      setError("Slack integration not found or not active for this project. Cannot add new settings.");
      return;
    }
    setEditingSetting(null);
    setChannelIdInput('');
    setNotificationTypeInput('all_changes');
    setShowModal(true);
  };

  const handleOpenModalToEdit = (setting: ProjectSlackNotificationSetting) => {
    setEditingSetting(setting);
    setChannelIdInput(setting.channelId);
    setNotificationTypeInput(setting.notificationType);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSetting(null);
    setError(null); // Clear form-specific errors
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!channelIdInput.trim()) {
      setError("Channel ID is required.");
      return;
    }
    if (!activeSlackInstallationId && !editingSetting) {
        setError("Active Slack Installation ID is missing.");
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (editingSetting) {
        const updateData: UpdateSettingBody = { notificationType: notificationTypeInput };
        await updateProjectSlackSetting(editingSetting.id, updateData);
      } else if (activeSlackInstallationId) { // Should always be true if modal opened for add
        const createData: CreateSettingBody = {
          projectId,
          slackInstallationId: activeSlackInstallationId,
          channelId: channelIdInput,
          notificationType: notificationTypeInput,
        };
        await createProjectSlackSetting(createData);
      }
      await loadSettings(); // Refresh list
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (settingId: string) => {
    if (window.confirm('Are you sure you want to delete this Slack notification setting?')) {
      setIsLoading(true);
      setError(null);
      try {
        await deleteProjectSlackSetting(settingId);
        await loadSettings(); // Refresh list
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete setting');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!projectId) return <p>Project ID is missing.</p>;

  return (
    <div>
      <h3>Slack Notification Channels</h3>
      {isLoading && <p>Loading settings...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <button onClick={handleOpenModalToAdd} disabled={!activeSlackInstallationId || isLoading}>
        Add New Channel
      </button>
      {!activeSlackInstallationId && <p><small>To add a new channel, ensure Slack is integrated with this project.</small></p>}

      {settings.length === 0 && !isLoading && <p>No Slack notification channels configured.</p>}
      
      <ul>
        {settings.map((setting) => (
          <li key={setting.id}>
            Channel ID: {setting.channelId} - Type: {setting.notificationType}
            <button onClick={() => handleOpenModalToEdit(setting)} style={{ marginLeft: '10px' }} disabled={isLoading}>
              Edit
            </button>
            <button onClick={() => handleDelete(setting.id)} style={{ marginLeft: '5px' }} disabled={isLoading}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {showModal && (
        <div style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px', backgroundColor: '#f9f9f9' }}>
          <h4>{editingSetting ? 'Edit' : 'Add'} Slack Notification Channel</h4>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="channelId">Slack Channel ID:</label>
              <input
                type="text"
                id="channelId"
                value={channelIdInput}
                onChange={(e) => setChannelIdInput(e.target.value)}
                required
                disabled={!!editingSetting} // Optionally disable if editing channel ID is not allowed
              />
            </div>
            <div style={{ marginTop: '10px' }}>
              <label htmlFor="notificationType">Notification Type:</label>
              <select
                id="notificationType"
                value={notificationTypeInput}
                onChange={(e) => setNotificationTypeInput(e.target.value as 'all_changes' | 'reference_changes')}
              >
                <option value="all_changes">All Changes</option>
                <option value="reference_changes">Only Reference Branch Changes</option>
              </select>
            </div>
            <div style={{ marginTop: '15px' }}>
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : (editingSetting ? 'Update Setting' : 'Add Setting')}
              </button>
              <button type="button" onClick={handleCloseModal} style={{ marginLeft: '10px' }} disabled={isLoading}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectSlackSettings;
