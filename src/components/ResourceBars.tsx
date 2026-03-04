/**
 * ResourceBars.tsx
 * Visual bar chart showing Available / Allocated / Max per resource type.
 */
import React from 'react';

interface Props {
    total: number[];
    available: number[];
    alloc: number[][];  // [N][M]
    n: number;
    m: number;
}

const ResourceBars: React.FC<Props> = ({ total, available, alloc, m }) => {
    const totalAlloc = Array.from({ length: m }, (_, j) =>
        alloc.reduce((s, row) => s + (row[j] ?? 0), 0)
    );

    return (
        <div className="resource-bars">
            {Array.from({ length: m }, (_, j) => {
                const tot = total[j] || 1;
                const allocPct = (totalAlloc[j] / tot) * 100;
                const availPct = (available[j] / tot) * 100;
                return (
                    <div className="res-bar-row" key={j}>
                        <div className="res-bar-header">
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>R{j}</span>
                            <span>
                                Alloc: <strong style={{ color: 'var(--accent-blue)' }}>{totalAlloc[j]}</strong>
                                &nbsp;/ Avail: <strong style={{ color: 'var(--color-safe)' }}>{available[j]}</strong>
                                &nbsp;/ Total: <strong>{total[j]}</strong>
                            </span>
                        </div>

                        {/* Allocation bar */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: 46 }}>Allocated</span>
                            <div className="res-bar-track" style={{ flex: 1 }}>
                                <div
                                    className="res-bar-fill alloc"
                                    style={{ width: `${Math.min(allocPct, 100)}%` }}
                                    title={`Allocated: ${totalAlloc[j]} / ${total[j]}`}
                                />
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: 24, textAlign: 'right' }}>
                                {Math.round(allocPct)}%
                            </span>
                        </div>

                        {/* Available bar */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: 46 }}>Available</span>
                            <div className="res-bar-track" style={{ flex: 1 }}>
                                <div
                                    className="res-bar-fill avail"
                                    style={{ width: `${Math.min(availPct, 100)}%` }}
                                    title={`Available: ${available[j]} / ${total[j]}`}
                                />
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: 24, textAlign: 'right' }}>
                                {Math.round(availPct)}%
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ResourceBars;
