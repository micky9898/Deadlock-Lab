/**
 * App.tsx — Main application shell
 */
import React, { useState } from 'react';
import ScenarioEditor from './components/ScenarioEditor';
import RequestPanel from './components/RequestPanel';
import BankersResultPanel from './components/BankersResultPanel';
import DetectionResultPanel from './components/DetectionResultPanel';
import LogPanel from './components/LogPanel';
import PlaybackBar from './components/PlaybackBar';
import { useSimulator } from './hooks/useSimulator';

type MainTab = 'results' | 'log';

const App: React.FC = () => {
  const sim = useSimulator();
  const [activeTab, setActiveTab] = useState<MainTab>('results');

  const hasResults =
    sim.bankersResults.length > 0 || sim.detectionResult !== null;

  return (
    <div className="app-shell">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="app-header" role="banner">
        <div className="app-header-logo">
          <div className="logo-icon" aria-hidden="true">🔒</div>
          <div>
            <div className="logo-title">DeadlockSim</div>
            <div className="logo-subtitle">Banker's Algorithm &amp; Deadlock Detection</div>
          </div>
        </div>

        <div className="header-spacer" />

        {/* Algorithm Toggle */}
        <nav className="algo-toggle" role="navigation" aria-label="Algorithm selector">
          <button
            id="btn-bankers"
            className={sim.algorithm === 'bankers' ? 'active' : ''}
            onClick={() => sim.setAlgorithm('bankers')}
            aria-pressed={sim.algorithm === 'bankers'}
          >
            🏦 Banker's Algorithm
          </button>
          <button
            id="btn-detection"
            className={sim.algorithm === 'detection' ? 'active' : ''}
            onClick={() => sim.setAlgorithm('detection')}
            aria-pressed={sim.algorithm === 'detection'}
          >
            🕸️ Deadlock Detection
          </button>
        </nav>

        <button
          className="btn btn-ghost btn-sm"
          onClick={sim.resetAll}
          title="Reset to default scenario"
          style={{ marginLeft: 8 }}
        >
          ↺ Reset
        </button>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <main className="app-main" role="main">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="sidebar" aria-label="Scenario configuration">
          {/* Scenario editor */}
          <ScenarioEditor
            state={sim.simState}
            selectedPreset={sim.selectedPreset}
            isCustomActive={sim.isCustomActive}
            onPresetSelect={sim.loadPreset}
            onCustom={sim.loadCustom}
            onChange={sim.updateSimState}
          />

          {/* Validation errors */}
          {sim.validationErrors.length > 0 && (
            <div className="sidebar-section">
              <div className="validation-errors">
                <div className="validation-error-title">⚠️ Validation Errors</div>
                <ul>
                  {sim.validationErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Request panel */}
          <RequestPanel
            simState={sim.simState}
            requests={sim.requests}
            onAdd={sim.addRequest}
            onRemove={sim.removeRequest}
            onClear={sim.clearRequests}
            onRun={sim.runSimulation}
          />
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div className="main-content">
          {/* Tab bar */}
          <nav className="tab-bar" role="tablist" aria-label="Output views">
            <button
              id="tab-results"
              role="tab"
              className={`tab-btn${activeTab === 'results' ? ' active' : ''}`}
              onClick={() => setActiveTab('results')}
              aria-selected={activeTab === 'results'}
            >
              {sim.algorithm === 'bankers' ? '🏦' : '🕸️'}&nbsp;
              {sim.algorithm === 'bankers' ? "Banker's Result" : 'Detection Result'}
              {hasResults && (
                <span
                  style={{
                    marginLeft: 6,
                    padding: '1px 7px',
                    borderRadius: 99,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background:
                      sim.algorithm === 'bankers'
                        ? sim.bankersResults.every((r) => r.granted)
                          ? 'var(--color-safe-bg)'
                          : sim.bankersResults.some((r) => r.granted)
                            ? 'var(--color-warn-bg)'
                            : 'var(--color-unsafe-bg)'
                        : sim.detectionResult?.deadlocked
                          ? 'var(--color-unsafe-bg)'
                          : 'var(--color-safe-bg)',
                    color:
                      sim.algorithm === 'bankers'
                        ? sim.bankersResults.every((r) => r.granted)
                          ? 'var(--color-safe)'
                          : sim.bankersResults.some((r) => r.granted)
                            ? 'var(--color-warn)'
                            : 'var(--color-unsafe)'
                        : sim.detectionResult?.deadlocked
                          ? 'var(--color-unsafe)'
                          : 'var(--color-safe)',
                  }}
                >
                  {sim.algorithm === 'bankers'
                    ? `${sim.bankersResults.filter((r) => r.granted).length}/${sim.bankersResults.length} granted`
                    : sim.detectionResult?.deadlocked
                      ? 'DEADLOCK'
                      : 'SAFE'}
                </span>
              )}
            </button>

            <button
              id="tab-log"
              role="tab"
              className={`tab-btn${activeTab === 'log' ? ' active' : ''}`}
              onClick={() => setActiveTab('log')}
              aria-selected={activeTab === 'log'}
            >
              📋 Step Log
              {sim.allSteps.length > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    padding: '1px 7px',
                    borderRadius: 99,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: 'var(--color-info-bg)',
                    color: 'var(--color-info)',
                  }}
                >
                  {sim.stepIndex + 1}/{sim.allSteps.length}
                </span>
              )}
            </button>
          </nav>

          {/* Tab content */}
          <div
            className="tab-content"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
          >
            {activeTab === 'results' ? (
              sim.algorithm === 'bankers' ? (
                <BankersResultPanel
                  results={sim.bankersResults}
                  requests={sim.requests}
                  simState={sim.simState}
                />
              ) : (
                <DetectionResultPanel
                  result={sim.detectionResult}
                  simState={sim.simState}
                  requests={sim.requests}
                  wfgEdges={sim.wfgEdges}
                />
              )
            ) : (
              <LogPanel
                steps={sim.allSteps}
                currentIndex={sim.stepIndex}
                onExport={sim.exportLog}
              />
            )}
          </div>

          {/* Playback bar — always visible when there are steps */}
          {sim.allSteps.length > 0 && (
            <PlaybackBar
              total={sim.allSteps.length}
              current={sim.stepIndex}
              isPlaying={sim.isPlaying}
              speed={sim.playSpeed}
              onPrev={sim.stepPrev}
              onNext={sim.stepNext}
              onFirst={sim.stepFirst}
              onLast={sim.stepLast}
              onPlay={sim.play}
              onPause={sim.pause}
              onReset={sim.resetPlayback}
              onSpeedChange={sim.setPlaySpeed}
              onSeek={sim.seekStep}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
