// client/src/components/SettingsModal.jsx
// User preferences, max self-heal retry configuration, theme density, and session auth management

import React, { useState } from 'react';
import './SettingsModal.css';

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
  onShowToast,
}) {
  if (!isOpen) return null;

  const currentSettings = user?.settings || {};
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [maxHealRetries, setMaxHealRetries] = useState(currentSettings.maxHealRetries || 5);
  const [preferredGenre, setPreferredGenre] = useState(currentSettings.preferredGenre || 'all');
  const [themeDensity, setThemeDensity] = useState(currentSettings.themeDensity || 'comfortable');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyToken = () => {
    if (user?.token) {
      navigator.clipboard.writeText(user.token);
      setCopied(true);
      onShowToast?.({ type: 'info', title: 'Token Copied', message: 'Session token copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateProfile({
        displayName: displayName.trim(),
        email: email.trim() || null,
        settings: {
          maxHealRetries: parseInt(maxHealRetries, 10),
          preferredGenre,
          themeDensity,
        },
      });
      onShowToast?.({ type: 'success', title: 'Preferences Saved', message: 'Your settings and session have been updated' });
      onClose();
    } catch (err) {
      onShowToast?.({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content settings-modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="settings-header-title">
            <span className="settings-icon">⚙</span>
            <h3>Preferences & Session</h3>
          </div>
          <button className="btn-ghost modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body settings-body">
            {/* ── Section: User Identity & Session ── */}
            <div className="settings-section">
              <h4 className="settings-section-title">Identity & Device Session</h4>
              <p className="settings-hint">
                Your history is tied to your persistent device token. You can optionally attach an email address to identify your builds across browsers.
              </p>

              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Neo Architect"
                  maxLength={40}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email (Optional Magic Sync)</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="architect@domain.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Device Session Token</label>
                <div className="token-field">
                  <code className="token-code">{user?.token || 'Loading token...'}</code>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyToken}>
                    {copied ? '✓ Copied' : 'Copy Token'}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Section: Self-Healing Pipeline Engine ── */}
            <div className="settings-section">
              <h4 className="settings-section-title">Engine Configuration</h4>
              
              <div className="form-group">
                <label className="form-label">
                  Max Self-Heal Retries
                  <span className="label-badge">{maxHealRetries} Cycles</span>
                </label>
                <p className="settings-hint">
                  The maximum targeted patch cycles the sensory harness executes before stopping.
                </p>
                <div className="retries-chips">
                  {[3, 5, 8].map(count => (
                    <button
                      key={count}
                      type="button"
                      className={`chip-btn ${maxHealRetries === count ? 'active' : ''}`}
                      onClick={() => setMaxHealRetries(count)}
                    >
                      {count} Retries {count === 5 ? '(Standard)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Default Genre</label>
                <select
                  className="form-select"
                  value={preferredGenre}
                  onChange={e => setPreferredGenre(e.target.value)}
                >
                  <option value="all">Any Genre (Natural Spec Parsing)</option>
                  <option value="arcade">Arcade & Dodge</option>
                  <option value="action">Top-Down Action</option>
                  <option value="roguelike">Roguelike Dungeon</option>
                  <option value="puzzle">Physics & Puzzle</option>
                  <option value="shooter">Space Shooter</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">UI Density</label>
                <div className="retries-chips">
                  <button
                    type="button"
                    className={`chip-btn ${themeDensity === 'comfortable' ? 'active' : ''}`}
                    onClick={() => setThemeDensity('comfortable')}
                  >
                    Comfortable
                  </button>
                  <button
                    type="button"
                    className={`chip-btn ${themeDensity === 'compact' ? 'active' : ''}`}
                    onClick={() => setThemeDensity('compact')}
                  >
                    Compact
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
