/**
 * LogPanel.tsx
 * Timestamped step-by-step log viewer with export functionality.
 */
import React, { useEffect, useRef } from 'react';
import type { SimStep } from '../types';

interface Props {
    steps: SimStep[];
    currentIndex: number; // highlight active step
    onExport: () => void;
}

const phaseLabel: Record<SimStep['phase'], string> = {
    validate: 'VALIDATE',
    tentative: 'TENTATIVE',
    safety: 'SAFETY',
    commit: 'COMMIT',
    rollback: 'ROLLBACK',
    detection: 'DETECT',
    info: 'INFO',
};

const LogPanel: React.FC<Props> = ({ steps, currentIndex, onExport }) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLDivElement>(null);

    // Scroll to active step
    useEffect(() => {
        activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [currentIndex]);

    if (steps.length === 0) {
        return (
            <div className="empty-state" style={{ padding: '32px' }}>
                <span className="empty-icon">📋</span>
                <span className="empty-text">Run an algorithm to see the step-by-step log</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="export-btn-row">
                <button className="btn btn-secondary btn-sm" onClick={onExport} title="Copy log to clipboard">
                    📋 Export Log
                </button>
            </div>
            <div className="log-panel">
                {steps.slice(0, currentIndex + 1).map((step, idx) => (
                    <div
                        key={step.id}
                        ref={idx === currentIndex ? activeRef : undefined}
                        className={`log-entry phase-${step.phase}${idx === currentIndex ? ' active' : ''}`}
                    >
                        <span className="log-ts">{step.timestamp}</span>
                        <span className="log-phase">{phaseLabel[step.phase]}</span>
                        <span className="log-msg">{step.message}</span>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default LogPanel;
