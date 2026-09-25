// client/src/components/GameLibrary.jsx
// Games History & Library view: card grid, search, filters, pagination, and replay detail triggers

import React, { useState, useEffect } from 'react';
import './GameLibrary.css';

export default function GameLibrary({
  user,
  onOpenGameDetail,
  onRemixPrompt,
  onNavigateToGenerator,
}) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all'); // 'all' | 'user'
  const [statusFilter, setStatusFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasMore: false });
  const [expandedPrompts, setExpandedPrompts] = useState({});

  const fetchGames = async (pageNum = 1) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        scope,
        page: pageNum,
        limit: 12,
        sort: sortOrder,
        status: statusFilter,
        genre: genreFilter,
        search,
      });

      const headers = user?.token ? { 'Authorization': `Bearer ${user.token}` } : {};

      const res = await fetch(`/api/games?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch library');
      const data = await res.json();

      setGames(data.games || []);
      setPagination(data.pagination || { total: 0, totalPages: 1, hasMore: false });
      setPage(pageNum);
    } catch (err) {
      console.error('Library fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames(1);
  }, [scope, user?.token, statusFilter, genreFilter, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGames(1);
  };

  const togglePromptExpand = (gameId, e) => {
    e.stopPropagation();
    setExpandedPrompts(prev => ({ ...prev, [gameId]: !prev[gameId] }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="game-library fade-in">
      {/* ── Library Header & Controls ── */}
      <div className="library-header-card">
        <div className="library-title-row">
          <div className="library-heading">
            <h2>My Game Archive</h2>
            <p className="library-subheading">
              Persistent repository of every autonomous build, test assertion result, and self-heal repair log.
            </p>
          </div>
          <button className="btn btn-primary" onClick={onNavigateToGenerator}>
            <span>⚡ Generate New Game</span>
          </button>
        </div>

        {/* ── Scope Tabs: Hall of Fame vs My Builds ── */}
        <div className="library-scope-nav" style={{ display: 'flex', gap: 10, margin: '14px 0 16px 0', borderBottom: '1px solid #E2E4EC', paddingBottom: 12 }}>
          <button
            type="button"
            className={`btn ${scope === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setScope('all')}
          >
            🌟 Hall of Fame & Community Showcase ({scope === 'all' ? pagination.total : 'All'})
          </button>
          <button
            type="button"
            className={`btn ${scope === 'user' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setScope('user')}
          >
            👤 My Personal Builds {scope === 'user' && `(${pagination.total})`}
          </button>
        </div>

        {/* ── Filter / Search Bar ── */}
        <div className="library-controls-bar">
          <form className="search-form" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="search-input"
              placeholder="Search past games or prompts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary search-btn">
              Search
            </button>
          </form>

          <div className="filters-group">
            <div className="filter-item">
              <label>Status:</label>
              <select
                className="control-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Builds ({pagination.total})</option>
                <option value="complete">✓ Verified Playable</option>
                <option value="failed">✕ Failed</option>
                <option value="running">⏳ In Progress</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Genre:</label>
              <select
                className="control-select"
                value={genreFilter}
                onChange={e => setGenreFilter(e.target.value)}
              >
                <option value="all">All Genres</option>
                <option value="arcade">Arcade</option>
                <option value="action">Action</option>
                <option value="roguelike">Roguelike</option>
                <option value="puzzle">Puzzle</option>
                <option value="shooter">Shooter</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Sort:</label>
              <select
                className="control-select"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Games Card Grid ── */}
      {loading ? (
        <div className="library-grid">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="game-card skeleton-card">
              <div className="skeleton card-thumb-skeleton"></div>
              <div className="card-body-skeleton">
                <div className="skeleton skeleton-line" style={{ width: '70%', height: 20 }}></div>
                <div className="skeleton skeleton-line" style={{ width: '40%', height: 14 }}></div>
                <div className="skeleton skeleton-line" style={{ width: '90%', height: 36 }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="library-empty-state">
          <div className="empty-state-icon">🎮</div>
          <h3>You haven't built anything yet</h3>
          <p>
            Enter a single natural language description, and watch the closed-loop engine write, test, and self-heal your custom playable game.
          </p>
          <button className="btn btn-primary btn-lg" onClick={onNavigateToGenerator}>
            ⚡ Launch First Game Generator
          </button>
        </div>
      ) : (
        <>
          <div className="library-grid">
            {games.map(game => {
              const isExpanded = expandedPrompts[game.id];
              const promptTruncated = game.prompt.length > 110 && !isExpanded;

              return (
                <div
                  key={game.id}
                  className="game-card fade-in"
                  onClick={() => onOpenGameDetail(game.id)}
                >
                  {/* Card Thumbnail / Preview Frame */}
                  <div className="card-thumbnail">
                    {game.thumbnail_url ? (
                      <img src={game.thumbnail_url} alt={game.title} className="thumb-img" />
                    ) : (
                      <div className="thumb-placeholder">
                        <span className="placeholder-icon">🕹️</span>
                        <span className="placeholder-text">Canvas Ready</span>
                      </div>
                    )}
                    <div className="card-status-badge">
                      {game.status === 'complete' && (
                        <span className="badge badge-pass">✓ Verified</span>
                      )}
                      {game.status === 'failed' && (
                        <span className="badge badge-fail">✕ Unresolved</span>
                      )}
                      {game.status === 'running' && (
                        <span className="badge badge-running">⏳ Testing</span>
                      )}
                      {game.status === 'error' && (
                        <span className="badge badge-warn">⚠ Stalled</span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="card-body">
                    <div className="card-header-row">
                      <h4 className="card-title">{game.title || 'Untitled Game'}</h4>
                      <span className="card-genre">{game.genre || 'Arcade'}</span>
                    </div>

                    <div className="card-prompt-wrapper">
                      <p className="card-prompt">
                        {promptTruncated ? `${game.prompt.slice(0, 110)}...` : game.prompt}
                      </p>
                      {game.prompt.length > 110 && (
                        <button
                          type="button"
                          className="prompt-expand-btn"
                          onClick={(e) => togglePromptExpand(game.id, e)}
                        >
                          {isExpanded ? 'Show less' : 'Read full prompt'}
                        </button>
                      )}
                    </div>

                    {/* Metadata Telemetry */}
                    <div className="card-meta-pills font-mono">
                      <div className="meta-pill" title="Build attempts taken">
                        <span className="meta-k">Builds:</span>
                        <span className="meta-v">#{game.final_attempt}</span>
                      </div>
                      <div className="meta-pill" title="Self-heal cycles executed">
                        <span className="meta-k">Heals:</span>
                        <span className="meta-v highlight-fuchsia">{game.heal_cycles}</span>
                      </div>
                      {game.elapsed_sec > 0 && (
                        <div className="meta-pill" title="Total pipeline duration">
                          <span className="meta-k">Time:</span>
                          <span className="meta-v">{game.elapsed_sec}s</span>
                        </div>
                      )}
                    </div>

                    <div className="card-date">{formatDate(game.created_at)}</div>
                  </div>

                  {/* Card Actions */}
                  <div className="card-footer">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenGameDetail(game.id);
                      }}
                    >
                      ▶ Replay & Inspect
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost-fuchsia btn-sm"
                      title="Pre-fill prompt into generator"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemixPrompt(game.prompt);
                      }}
                    >
                      ⚡ Remix
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination Controls ── */}
          {pagination.totalPages > 1 && (
            <div className="library-pagination">
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => fetchGames(page - 1)}
              >
                ◀ Previous
              </button>
              <span className="page-indicator font-mono">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => fetchGames(page + 1)}
              >
                Next ▶
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
