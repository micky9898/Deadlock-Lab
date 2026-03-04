/**
 * BankersResultPanel.tsx
 * Shows Banker's Algorithm results: safe/unsafe banner, safe sequence, matrices.
 */
import React from 'react';
import type { BankersResult, SimulationState, ResourceRequest } from '../types';
import MatrixDisplay from './MatrixDisplay';
import ResourceBars from './ResourceBars';
import { computeNeed } from '../utils/algorithms';

interface Props {
    results: BankersResult[];
    requests: ResourceRequest[];
    simState: SimulationState;
}

const BankersResultPanel: React.FC<Props> = ({ results, requests, simState }) => {
    const { n, m, total, max } = simState;
    const colHeaders = Array.from({ length: m }, (_, j) => `R${j}`);
    const rowLabels = Array.from({ length: n }, (_, i) => `P${i}`);

    if (results.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon">🏦</span>
                <span className="empty-text">
                    Configure a scenario, add requests, and click <strong>Run Simulation</strong>
                </span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {results.map((result, idx) => {
                const req = requests[idx];
                const displayAlloc = result.newAlloc ?? simState.alloc;
                const displayAvail = result.newAvailable ?? simState.available;
                const displayNeed = computeNeed(max, displayAlloc);

                return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Banner */}
                        <div className={`result-banner ${result.granted ? 'safe' : 'unsafe'}`}>
                            <span className="result-icon">{result.granted ? '✅' : '❌'}</span>
                            <div>
                                <div className="result-title">
                                    {req ? `P${req.pid} → [${req.vector.join(', ')}]` : `Request ${idx + 1}`}
                                    &nbsp;
                                    <span className={`status-badge ${result.granted ? 'status-safe' : 'status-unsafe'}`}>
                                        {result.granted ? 'GRANTED' : 'DENIED'}
                                    </span>
                                </div>
                                <div className="result-detail">
                                    {result.reason ?? (result.granted ? 'System remains in safe state' : '')}
                                </div>

                                {/* Safe sequence */}
                                {result.granted && result.safeSequence && (
                                    <div style={{ marginTop: 12 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            Safe Sequence
                                        </div>
                                        <div className="safe-sequence">
                                            {result.safeSequence.map((pid, si) => (
                                                <React.Fragment key={pid}>
                                                    <div
                                                        className="seq-node"
                                                        style={{ animationDelay: `${si * 60}ms` }}
                                                        title={`Process P${pid}`}
                                                    >
                                                        P{pid}
                                                    </div>
                                                    {si < result.safeSequence!.length - 1 && (
                                                        <span className="seq-arrow">→</span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Matrices */}
                        <div className="matrices-grid">
                            <MatrixDisplay
                                title={`Available${result.granted ? ' (after grant)' : ''}`}
                                headers={colHeaders}
                                rowLabels={['avail']}
                                data={[displayAvail]}
                            />
                            <MatrixDisplay
                                title={`Allocation${result.granted ? ' (after grant)' : ''}`}
                                headers={colHeaders}
                                rowLabels={rowLabels}
                                data={displayAlloc}
                                cellClass={(i, _j, v) =>
                                    req && i === req.pid && result.granted && v > 0 ? 'highlight' : ''
                                }
                            />
                            <MatrixDisplay
                                title="Need"
                                headers={colHeaders}
                                rowLabels={rowLabels}
                                data={displayNeed}
                                cellClass={(_i, _j, v) => (v === 0 ? '' : v < 0 ? 'warn-cell' : '')}
                            />
                        </div>

                        {/* Resource bars */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                            <div className="card-title"><span>📊</span> Resource Utilization</div>
                            <ResourceBars
                                total={total}
                                available={displayAvail}
                                alloc={displayAlloc}
                                n={n}
                                m={m}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BankersResultPanel;
