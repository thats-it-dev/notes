import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Button } from '@thatsit/ui';
import { db } from '../lib/db';
import { createPortal } from 'react-dom';
import './SettingsPanel.css';
import { X } from 'lucide-react';

export function SettingsPanel() {
  const { settingsPanelOpen, setSettingsPanelOpen } = useAppStore();
  // const [syncUrl, setSyncUrl] = useState(() => localStorage.getItem('syncUrl') || '');
  // const [email, setEmail] = useState('');
  // const [password, setPassword] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // const handleSaveSyncUrl = () => {
  //   localStorage.setItem('syncUrl', syncUrl);
  // };

  // const handleLogin = async () => {
  //   // TODO: Implement actual login when backend is ready
  //   console.log('Login with:', email, syncUrl);
  // };

  const handleDeleteAllData = async () => {
    await db.notes.clear();
    await db.tasks.clear();
    await db.tags.clear();
    localStorage.removeItem('syncUrl');
    localStorage.removeItem('authToken');
    setShowDeleteDialog(false);
    window.location.reload();
  };

  if (!settingsPanelOpen) return null;

  return createPortal(
    <div className="settings-overlay" onClick={() => setSettingsPanelOpen(false)}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <Button
            variant="ghost"
            className="settings-close"
            onClick={() => setSettingsPanelOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>

        <div className="settings-content">
          {/* Sync Section */}
          {/* <section className="settings-section">
            <h3 className="settings-section-title">Sync</h3>
            <div className="settings-field">
              <label className="settings-label">Sync URL</label>
              <Input
                type="url"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
                placeholder="https://sync.thatsit.app"
              />
              <Button onClick={handleSaveSyncUrl}>Save URL</Button>
            </div>

            <div className="settings-field">
              <label className="settings-label">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="settings-field">
              <label className="settings-label">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button onClick={handleLogin}>Login</Button>
          </section> */}

          {/* Danger Zone */}
          <section className="settings-section settings-danger-zone">
            <h3 className="settings-section-title">Danger Zone</h3>
            <p className="settings-danger-description">
              This will permanently delete all your notes, tasks, and settings.
            </p>
            <Button onClick={() => setShowDeleteDialog(true)}>
              Delete All Data
            </Button>
          </section>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && createPortal(
          <div className="dialog-overlay" onClick={() => setShowDeleteDialog(false)}>
            <div className="dialog" onClick={(e) => e.stopPropagation()}>
              <h3 className="dialog-title">Are you sure?</h3>
              <p className="dialog-message">
                This will permanently delete all your notes, tasks, and settings. This action cannot be undone.
              </p>
              <div className="dialog-actions">
                <Button onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleDeleteAllData}>
                  Delete All Data
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>,
    document.body
  );
}
