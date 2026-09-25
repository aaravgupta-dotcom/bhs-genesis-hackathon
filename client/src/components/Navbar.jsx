// client/src/components/Navbar.jsx
import React from 'react';
import './Navbar.css';

const PRIMARY_LINKS = [
  { id: 'generator', label: 'Studio' },
  { id: 'arena', label: 'Arena' },
  { id: 'library', label: 'Games' },
];

const EXHIBIT_VIEWS = [
  { id: 'tiger', label: 'Tiger Reveal', detail: 'Interactive poster' },
  { id: 'ticket', label: 'Breathing Ticket', detail: 'Engraved print' },
];

const LAB_VIEWS = [
  { id: 'healing', label: 'Self-Healing Lab', detail: 'Test and repair game logic' },
  { id: 'sound', label: 'Retro Sound Lab', detail: 'Create game sound effects' },
];

export default function Navbar({
  currentView,
  onNavigate,
  user,
  stats,
  onOpenSettings,
}) {
  return (
    <header className="site-navbar">
      <div className="navbar-container">
        <button
          type="button"
          className="navbar-brand"
          onClick={() => onNavigate('generator')}
        >
          <span className="brand-mark">GA</span>
          <span className="brand-title">Game Architect</span>
        </button>

        <nav className="navbar-links" aria-label="Main">
          {PRIMARY_LINKS.slice(0, 2).map((link) => (
            <button
              key={link.id}
              type="button"
              className={`nav-link ${currentView === link.id ? 'active' : ''}`}
              onClick={() => onNavigate(link.id)}
            >
              {link.label}
              {link.id === 'library' && stats?.total > 0 && (
                <span className="nav-count">{stats.total}</span>
              )}
            </button>
          ))}
          <details className={`nav-menu ${['tiger', 'ticket'].includes(currentView) ? 'active' : ''}`}>
            <summary>Exhibits <span aria-hidden="true">⌄</span></summary>
            <div className="nav-popover">
              <span className="nav-popover-label">Interactive exhibits</span>
              {EXHIBIT_VIEWS.map((view) => (
                <button key={view.id} type="button" onClick={() => onNavigate(view.id)}>
                  <strong>{view.label}</strong><small>{view.detail}</small>
                </button>
              ))}
            </div>
          </details>
          <details className={`nav-menu ${['healing', 'sound'].includes(currentView) ? 'active' : ''}`}>
            <summary>Labs <span aria-hidden="true">⌄</span></summary>
            <div className="nav-popover">
              <span className="nav-popover-label">Build tools</span>
              {LAB_VIEWS.map((view) => (
                <button key={view.id} type="button" onClick={() => onNavigate(view.id)}>
                  <strong>{view.label}</strong><small>{view.detail}</small>
                </button>
              ))}
            </div>
          </details>
          {PRIMARY_LINKS.slice(2).map((link) => (
            <button
              key={link.id}
              type="button"
              className={`nav-link ${currentView === link.id ? 'active' : ''}`}
              onClick={() => onNavigate(link.id)}
            >
              {link.label}
              {link.id === 'library' && stats?.total > 0 && <span className="nav-count">{stats.total}</span>}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="navbar-user"
          onClick={onOpenSettings}
          title="Profile"
        >
          <span className="user-avatar">
            {(user?.display_name || user?.email || 'A')[0].toUpperCase()}
          </span>
          <span className="user-name">{user?.display_name || 'Architect'}</span>
        </button>
      </div>
    </header>
  );
}
