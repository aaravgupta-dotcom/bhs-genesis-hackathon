// client/src/App.jsx (Ticket integrated)
// Main application — orchestrates the 6-stage pipeline UI, User Library, Telemetry Sidebar & Modals

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import GameDetailModal from './components/GameDetailModal.jsx';
import GameLibrary from './components/GameLibrary.jsx';
import RunSidebar from './components/RunSidebar.jsx';
import PromptScreen from './components/PromptScreen.jsx';
import AgentConsole from './components/AgentConsole.jsx';
import GamePreview from './components/GamePreview.jsx';
import TestResults from './components/TestResults.jsx';
import VerifiedState from './components/VerifiedState.jsx';
import ArenaScreen from './components/ArenaScreen.jsx';
import ArtifactGallery from './components/ArtifactGallery.jsx';
import UnifiedLabs from './components/UnifiedLabs.jsx';
import EngineMetricsBar from './components/EngineMetricsBar.jsx';
import './App.css';

const API = ''; // Vite proxy handles /api/* → localhost:3001

export default function App() {
  // ── User Session & Identity ──────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, verified: 0, failed: 0, totalHeals: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Views & Navigation ───────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState('generator'); // 'generator' | 'library' | 'arena' | 'labs' | 'gallery'
  const [detailGameId, setDetailGameId] = useState(null);
  const [initialPrompt, setInitialPrompt] = useState('');


  // ── Toasts ───────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev.slice(-4), { id, ...toast }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Pipeline State ───────────────────────────────────────────────────────────
  const [appState, setAppState] = useState('idle'); // idle | running | complete | failed
  const [jobId, setJobId] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentStage, setCurrentStage] = useState(0);
  const [spec, setSpec] = useState(null);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [currentGameUrl, setCurrentGameUrl] = useState(null);
  const [assertions, setAssertions] = useState([]);
  const [healCycles, setHealCycles] = useState(0);
  const [bugsFixed, setBugsFixed] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [verifiedData, setVerifiedData] = useState(null);
  const [globalError, setGlobalError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [activeStageTab, setActiveStageTab] = useState(null);

  const sseRef = useRef(null);
  const jobIdRef = useRef(null);

  // ── Establish User Session ───────────────────────────────────────────────────
  const refreshStats = useCallback(async (token) => {
    const authToken = token || user?.token;
    if (!authToken) return;
    try {
      const res = await fetch(`${API}/api/auth/stats`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  }, [user?.token]);

  useEffect(() => {
    const savedToken = localStorage.getItem('ga_user_token');
    fetch(`${API}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: savedToken || undefined }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('ga_user_token', data.user.token);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      })
      .catch(err => console.error('Session init error:', err));
  }, []);

  const handleUpdateProfile = async (updates) => {
    if (!user?.token) return;
    const res = await fetch(`${API}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    const data = await res.json();
    setUser(data.user);
    return data.user;
  };

  // ── SSE Event Handler ────────────────────────────────────────────────────────
  const handleSSEEvent = useCallback((event) => {
    const data = JSON.parse(event.data);

    // Append to live console events
    setEvents(prev => [...prev, data]);

    switch (data.type) {
      case 'stage': {
        const stageMatch = data.message.match(/STAGE (\d+)/);
        if (stageMatch) {
          const st = parseInt(stageMatch[1], 10);
          setCurrentStage(st);
        }
        break;
      }

      case 'spec':
        setSpec(data.spec);
        showToast({
          type: 'info',
          title: 'Spec Synthesized',
          message: `"${data.spec?.title || 'Game'}" architecture defined.`,
        });
        break;

      case 'code_ready':
        setCurrentAttempt(data.attempt || 1);
        setCurrentGameUrl(`/games/${jobIdRef.current}_v${data.attempt}.html`);
        setIsThinking(false);
        break;

      case 'test_result':
        setAssertions(data.assertions || []);
        setCurrentAttempt(data.attempt || currentAttempt);
        setIsThinking(data.passed === false);
        if (data.passed) {
          showToast({
            type: 'success',
            title: 'Empirical Tests Passed',
            message: `Build #${data.attempt} verified playable!`,
          });
        }
        break;

      case 'patch_applied':
        setHealCycles(data.healCycle || 0);
        setIsThinking(true);
        setCurrentAttempt(data.attempt || currentAttempt);
        setCurrentGameUrl(`/games/${jobIdRef.current}_v${data.attempt}.html`);
        showToast({
          type: 'patch',
          title: `Self-Heal Cycle #${data.healCycle}`,
          message: data.diagnosis || 'Empirical patch applied to code.',
        });
        break;

      case 'pipeline_complete':
        setAppState('complete');
        setCurrentStage(6);
        setIsThinking(false);
        setVerifiedData({
          attempt: data.attempt,
          healCycles: data.healCycles,
          bugsFixed: data.bugsFixed || [],
          gameUrl: data.finalGameUrl,
          elapsedSec: data.elapsedSec,
        });
        setBugsFixed(data.bugsFixed || []);
        if (data.finalGameUrl) setCurrentGameUrl(data.finalGameUrl);
        closeSse();
        refreshStats();
        showToast({
          type: 'success',
          title: 'Playability Certified!',
          message: `Verified in ${data.attempt} build${data.attempt > 1 ? 's' : ''} (${data.healCycles} heal cycle${data.healCycles > 1 ? 's' : ''}).`,
          duration: 6000,
        });
        break;

      case 'pipeline_failed':
      case 'pipeline_error':
        setAppState('failed');
        setIsThinking(false);
        setGlobalError(data.message);
        closeSse();
        refreshStats();
        showToast({
          type: 'error',
          title: 'Pipeline Execution Error',
          message: data.message || 'Verification could not converge.',
          duration: 7000,
        });
        break;
    }
  }, [currentAttempt, refreshStats, showToast]);

  const closeSse = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  };

  // ── Start Pipeline ────────────────────────────────────────────────────────────
  const handleStart = async (prompt) => {
    setAppState('running');
    setEvents([]);
    setSpec(null);
    setAssertions([]);
    setCurrentStage(1);
    setCurrentAttempt(0);
    setCurrentGameUrl(null);
    setHealCycles(0);
    setBugsFixed([]);
    setIsThinking(true);
    setGlobalError(null);
    setVerifiedData(null);
    setStartTime(Date.now());
    setActiveStageTab(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      const res = await fetch(`${API}/api/pipeline/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          options: {
            maxHealRetries: user?.settings?.maxHealRetries || 5,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const { jobId: newJobId } = await res.json();
      setJobId(newJobId);
      jobIdRef.current = newJobId;

      const sse = new EventSource(`${API}/api/pipeline/stream/${newJobId}`);
      sseRef.current = sse;
      sse.onmessage = handleSSEEvent;
      sse.onerror = () => {
        if (appState === 'running') {
          console.warn('SSE stream disconnected or waiting for next event');
        }
      };
    } catch (err) {
      setAppState('failed');
      setIsThinking(false);
      setGlobalError(err.message);
      showToast({
        type: 'error',
        title: 'Launch Failed',
        message: err.message,
      });
    }
  };

  // ── Reset to New Game ────────────────────────────────────────────────────────
  const handleReset = () => {
    closeSse();
    setAppState('idle');
    setJobId(null);
    setEvents([]);
    setSpec(null);
    setCurrentStage(0);
    setCurrentAttempt(0);
    setCurrentGameUrl(null);
    setAssertions([]);
    setHealCycles(0);
    setBugsFixed([]);
    setIsThinking(false);
    setVerifiedData(null);
    setGlobalError(null);
    setStartTime(null);
    setActiveStageTab(null);
  };

  // ── Remix Prompt Flow ────────────────────────────────────────────────────────
  const handleRemixPrompt = (promptText) => {
    setInitialPrompt(promptText);
    setCurrentView('generator');
    handleReset();
    showToast({
      type: 'info',
      title: 'Prompt Loaded',
      message: 'Prompt transferred to generator. Modify or launch new build!',
    });
  };

  // Cleanup SSE on unmount
  useEffect(() => () => closeSse(), []);

  const isRunning = appState === 'running';
  const isComplete = appState === 'complete';
  const isFailed = appState === 'failed';

  return (
    <div className="app-layout">
      {/* ── Persistent Navigation Bar ── */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view === 'library') {
            refreshStats();
          }
        }}
        user={user}
        stats={stats}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* ── Toast Notifications ── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── Main View Area ── */}
      <main className="app-main">
        {/* ── Telemetry & Benchmarks Header ── */}
        {currentView === 'generator' && (
          <EngineMetricsBar
            totalGames={stats.total}
            totalVerified={stats.verified}
            totalHeals={stats.totalHeals}
          />
        )}

        {/* ── VIEW A: ARCHIVE LIBRARY ── */}
        {currentView === 'library' && (
          <GameLibrary
            user={user}
            onOpenGameDetail={(id) => setDetailGameId(id)}
            onRemixPrompt={handleRemixPrompt}
            onNavigateToGenerator={() => setCurrentView('generator')}
          />
        )}

        {['gallery', 'tiger', 'ticket', 'reveal'].includes(currentView) && (
          <ArtifactGallery
            key={currentView}
            initialTab={currentView === 'tiger' || currentView === 'reveal' ? 'tiger' : currentView === 'ticket' ? 'ticket' : 'both'}
            onRemixPrompt={handleRemixPrompt}
            onNavigateToGenerator={() => setCurrentView('generator')}
          />
        )}

        {['labs', 'healing', 'sound', 'chaos', 'sfx'].includes(currentView) && (
          <UnifiedLabs
            key={currentView}
            initialTab={currentView === 'sound' || currentView === 'sfx' ? 'sfx' : 'chaos'}
            onRemixPrompt={handleRemixPrompt}
            onNavigateToGenerator={() => setCurrentView('generator')}
          />
        )}


        {currentView === 'arena' && (
          <ArenaScreen
            user={user}
            onShowToast={showToast}
            onNavigateToGenerator={() => setCurrentView('generator')}
          />
        )}

        {/* ── VIEW B: GENERATOR & RUN ENGINE ── */}
        {currentView === 'generator' && (
          <>
            {/* 1. Prompt Landing Screen */}
            {appState === 'idle' && (
              <PromptScreen
                onStart={handleStart}
                isLoading={false}
                spec={null}
                initialPrompt={initialPrompt}
                onNavigate={setCurrentView}
              />
            )}

            {/* 2. Active Pipeline Engine (Running or Failed) */}
            {(isRunning || isFailed) && (
              <div className="pipeline-ui">
                {/* Global error banner */}
                {isFailed && globalError && (
                  <div className="pipeline-error fade-in">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div>
                      <strong>Pipeline Halted:</strong> {globalError}
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={handleReset} style={{ marginLeft: 'auto' }}>
                      ← Try Again
                    </button>
                  </div>
                )}

                <div className="pipeline-layout">
                  {/* Left: Collapsible Run Telemetry Drawer */}
                  <RunSidebar
                    currentStage={currentStage}
                    attempt={currentAttempt}
                    healCycles={healCycles}
                    maxHealRetries={user?.settings?.maxHealRetries || 5}
                    assertions={assertions}
                    spec={spec}
                    isRunning={isRunning}
                    startTime={startTime}
                    onSelectStageTab={(st) => setActiveStageTab(st)}
                    activeStageTab={activeStageTab}
                  />

                  {/* Main Pipeline Content */}
                  <div className="pipeline-main">
                    {/* Game Spec Banner */}
                    {spec && (
                      <div className="spec-sidebar fade-in">
                        <div className="spec-sidebar-header">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 11 12 14 22 4"/>
                          </svg>
                          <span>Spec Synthesized</span>
                        </div>
                        <div className="spec-sidebar-title">{spec.title}</div>
                        <div className="spec-sidebar-genre">{spec.genre}</div>
                        <div className="spec-sidebar-mechanics">
                          {spec.mechanics?.map((m, i) => (
                            <div key={i} className="spec-sidebar-mechanic">· {m}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Columns: Left Console + Tests, Right Game Canvas */}
                    <div className="pipeline-columns">
                      <div className="pipeline-left">
                        <AgentConsole
                          jobId={jobId}
                          events={events}
                          currentStage={currentStage}
                          isRunning={isRunning}
                        />
                        <TestResults
                          assertions={assertions}
                          healCycles={healCycles}
                          attempt={currentAttempt}
                          isRunning={isRunning}
                        />
                      </div>

                      <div className="pipeline-right">
                        <GamePreview
                          jobId={jobId}
                          attempt={currentAttempt}
                          isThinking={isThinking}
                          gameUrl={currentGameUrl}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Verified State: Certified Playable */}
            {isComplete && verifiedData && (
              <div className="verified-wrap fade-in">
                <div className="verified-layout">
                  <div className="verified-main">
                    <VerifiedState
                      jobId={jobId}
                      attempt={verifiedData.attempt}
                      gameUrl={verifiedData.gameUrl || currentGameUrl}
                      healCycles={verifiedData.healCycles}
                      bugsFixed={verifiedData.bugsFixed}
                      spec={spec}
                      onReset={handleReset}
                    />
                  </div>
                  <div className="verified-sidebar">
                    <AgentConsole
                      jobId={jobId}
                      events={events}
                      currentStage={6}
                      isRunning={false}
                    />
                    <TestResults
                      assertions={assertions}
                      healCycles={healCycles}
                      attempt={currentAttempt}
                      isRunning={false}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Settings & Profile Modal ── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onUpdateProfile={handleUpdateProfile}
        onShowToast={showToast}
      />

      {/* ── Game Detail Deep-Dive Modal (Play, Logs, Tests, Patches) ── */}
      {detailGameId && (
        <GameDetailModal
          gameId={detailGameId}
          user={user}
          onClose={() => setDetailGameId(null)}
          onRemixPrompt={handleRemixPrompt}
          onShowToast={showToast}
        />
      )}
    </div>
  );
}
