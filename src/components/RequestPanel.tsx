/**
 * RequestPanel.tsx
 * Build and manage a queue of resource requests.
 */
import React, { useState } from 'react';
import { Trash2, Shuffle, Plus, Play } from 'lucide-react';
import type { ResourceRequest, SimulationState } from '../types';
import { makeEmptyRequest, makeRandomRequest } from '../utils/presets';
import { computeAvailable } from '../utils/algorithms';

interface Props {
    simState: SimulationState;
    requests: ResourceRequest[];
    onAdd: (req: ResourceRequest) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onRun: () => void;
}

const RequestPanel: React.FC<Props> = ({
    simState,
    requests,
    onAdd,
    onRemove,
    onClear,
    onRun,
}) => {
    const { n, m, total, alloc } = simState;
    const available = computeAvailable(total, alloc);

    const [pid, setPid] = useState(0);
    const [vector, setVector] = useState<number[]>(new Array(m).fill(0));

    // Keep vector length in sync with M
    React.useEffect(() => {
        setVector((v) => {
            const next = [...v];
            while (next.length < m) next.push(0);
            return next.slice(0, m);
        });
    }, [m]);

    const handleAdd = () => {
        onAdd({ id: `req-${Date.now()}`, pid, vector: [...vector] });
        setVector(new Array(m).fill(0));
    };

    const handleRandom = () => {
        const req = makeRandomRequest(n, m, available);
        onAdd(req);
    };

    return (
        <div className="sidebar-section">
            <div className="section-label">
                <span>📨</span> Resource Requests
            </div>

            {/* Process selector */}
            <div className="request-row">
                <div className="field-group">
                    <label className="field-label" htmlFor="req-pid">Process</label>
                    <select
                        id="req-pid"
                        className="select-input"
                        value={pid}
                        onChange={(e) => setPid(parseInt(e.target.value, 10))}
                    >
                        {Array.from({ length: n }, (_, i) => (
                            <option key={i} value={i}>P{i}</option>
                        ))}
                    </select>
                </div>

                {/* Request vector */}
                <div className="field-group">
                    <span className="field-label">Request Vector</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {Array.from({ length: m }, (_, j) => (
                            <div key={j} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>R{j}</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="matrix-input"
                                    style={{ width: 44 }}
                                    value={vector[j] ?? 0}
                                    onChange={(e) => {
                                        const next = [...vector];
                                        next[j] = Math.max(0, parseInt(e.target.value, 10) || 0);
                                        setVector(next);
                                    }}
                                    aria-label={`Request R${j}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="btn-row">
                <button className="btn btn-secondary btn-sm" onClick={handleAdd}>
                    <Plus size={13} /> Add Request
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleRandom} title="Add a random request">
                    <Shuffle size={13} /> Random
                </button>
                {requests.length > 0 && (
                    <button className="btn btn-danger btn-sm" onClick={onClear}>
                        <Trash2 size={13} /> Clear All
                    </button>
                )}
            </div>

            {/* Queue list */}
            {requests.length > 0 && (
                <div className="request-queue">
                    {requests.map((req) => (
                        <div key={req.id} className="request-item">
                            <span className="pid-badge">P{req.pid}</span>
                            <span className="vec-text">[{req.vector.join(', ')}]</span>
                            <button
                                className="del-btn"
                                onClick={() => onRemove(req.id)}
                                aria-label={`Remove request from P${req.pid}`}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Run button */}
            <div style={{ marginTop: 14 }}>
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={onRun}
                    disabled={requests.length === 0}
                    id="run-simulation-btn"
                >
                    <Play size={15} /> Run Simulation
                </button>
            </div>
        </div>
    );
};

export default RequestPanel;
