/**
 * DetectionResultPanel.tsx
 * Shows deadlock detection output: WFG, deadlocked processes, cycle paths.
 */
import React from 'react';
import type { DetectionResult, SimulationState, ResourceRequest, WFGEdge } from '../types';
import WFGGraph from './WFGGraph';
import ResourceBars from './ResourceBars';

interface Props {
    result: DetectionResult | null;
    simState: SimulationState;
    requests: ResourceRequest[];
    wfgEdges: WFGEdge[];
}

const DetectionResultPanel: React.FC<Props> = ({ result, simState, requests, wfgEdges }) => {
    const { n, m, total, alloc, available } = simState;

    const deadlocked = result?.deadlockedProcesses ?? [];
    const cyclePaths = result?.cyclePaths ?? [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Result Banner */}
            {result ? (
                <div className={`result-banner ${result.deadlocked ? 'unsafe' : 'safe'}`}>
                    <span className="result-icon">{result.deadlocked ? '🔴' : '🟢'}</span>
                    <div>
                        <div className="result-title">
                            {result.deadlocked
                                ? `Deadlock Detected!`
                                : 'No Deadlock — System is Proceeding'}
                            &nbsp;
                            <span className={`status-badge ${result.deadlocked ? 'status-unsafe' : 'status-safe'}`}>
                                {result.deadlocked ? 'DEADLOCK' : 'CLEAN'}
                            </span>
                        </div>
                        {result.deadlocked && (
                            <div className="result-detail" style={{ marginTop: 6 }}>
                                Deadlocked processes:&nbsp;
                                {deadlocked.map((p, i) => (
                                    <React.Fragment key={p}>
                                        <span
                                            style={{
                                                color: 'var(--color-unsafe)',
                                                fontWeight: 700,
                                                background: 'rgba(239,68,68,0.1)',
                                                padding: '1px 8px',
                                                borderRadius: 99,
                                                marginRight: 4,
                                            }}
                                        >
                                            P{p}
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                        {cyclePaths.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                    Cycle Paths
                                </div>
                                {cyclePaths.map((path, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '0.8rem',
                                            color: 'var(--color-unsafe)',
                                            background: 'rgba(239,68,68,0.08)',
                                            padding: '6px 12px',
                                            borderRadius: 6,
                                            marginBottom: 4,
                                        }}
                                    >
                                        {path.map((p) => `P${p}`).join(' → ')}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="result-banner warn">
                    <span className="result-icon">ℹ️</span>
                    <div>
                        <div className="result-title">Detection not yet run</div>
                        <div className="result-detail">
                            Add pending requests and click <strong>Run Simulation</strong> to build the Wait-For Graph
                        </div>
                    </div>
                </div>
            )}

            {/* Wait-For Graph */}
            <div>
                <div className="section-label" style={{ marginBottom: 12 }}>
                    <span>🕸️</span> Wait-For Graph
                    {requests.length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                            &nbsp;(no pending requests — add some above)
                        </span>
                    )}
                </div>
                <WFGGraph
                    n={n}
                    edges={wfgEdges}
                    deadlockedProcesses={deadlocked}
                    cyclePaths={cyclePaths}
                />
            </div>

            {/* Resource Bars */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div className="card-title"><span>📊</span> Resource Utilization</div>
                <ResourceBars
                    total={total}
                    available={available}
                    alloc={alloc}
                    n={n}
                    m={m}
                />
            </div>

            {/* Process list */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div className="card-title"><span>⚙️</span> Process State</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {Array.from({ length: n }, (_, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '10px 16px',
                                borderRadius: 'var(--radius-md)',
                                border: `1px solid ${deadlocked.includes(i) ? 'var(--color-unsafe-border)' : 'var(--border)'}`,
                                background: deadlocked.includes(i) ? 'var(--color-unsafe-bg)' : 'var(--bg-input)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                minWidth: 100,
                            }}
                        >
                            <div style={{ fontWeight: 700, color: deadlocked.includes(i) ? 'var(--color-unsafe)' : 'var(--text-primary)' }}>
                                P{i} {deadlocked.includes(i) ? '🔴' : '🟢'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Alloc: [{alloc[i]?.join(', ')}]
                            </div>
                            {requests.find((r) => r.pid === i) && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-warn)' }}>
                                    Waiting: [{requests.find((r) => r.pid === i)?.vector.join(', ')}]
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DetectionResultPanel;
