/**
 * ScenarioEditor.tsx
 * Left sidebar panel: preset picker + dimension controls + matrix editors.
 */
import React from 'react';
import { Plus, Minus, PenLine } from 'lucide-react';
import MatrixEditor from './MatrixEditor';
import { SCENARIOS, CUSTOM_SCENARIO_IDX } from '../utils/presets';
import type { SimulationState } from '../types';

interface Props {
    state: SimulationState;
    selectedPreset: number | null;
    /** True when the custom blank-slate scenario is active */
    isCustomActive: boolean;
    onPresetSelect: (idx: number) => void;
    /** Called when the user clicks the Custom blank-slate button */
    onCustom: () => void;
    onChange: (partial: Partial<SimulationState>) => void;
}

const ScenarioEditor: React.FC<Props> = ({
    state,
    selectedPreset,
    isCustomActive,
    onPresetSelect,
    onCustom,
    onChange,
}) => {
    const { n, m, total, max, alloc } = state;

    // ── Dimension setters ────────────────────────────────────────────────────

    const setN = (next: number) => {
        const newN = Math.max(1, Math.min(8, next));
        const newMax = Array.from({ length: newN }, (_, i) =>
            max[i] ?? new Array(m).fill(0)
        );
        const newAlloc = Array.from({ length: newN }, (_, i) =>
            alloc[i] ?? new Array(m).fill(0)
        );
        onChange({ n: newN, max: newMax, alloc: newAlloc });
    };

    const setM = (next: number) => {
        const newM = Math.max(1, Math.min(6, next));
        const adjust = (matrix: number[][], cols: number) =>
            matrix.map((row) => {
                const r = [...row];
                while (r.length < cols) r.push(0);
                return r.slice(0, cols);
            });
        const newTotal = total.slice(0, newM);
        while (newTotal.length < newM) newTotal.push(0);
        onChange({
            m: newM,
            total: newTotal,
            max: adjust(max, newM),
            alloc: adjust(alloc, newM),
        });
    };

    // ── Matrix change handlers ───────────────────────────────────────────────

    const handleTotalChange = (next: number[][]) => {
        onChange({ total: next[0] });
    };

    // ── Validation helpers ───────────────────────────────────────────────────

    const allocInvalid = (i: number, j: number, val: number) => val > (max[i]?.[j] ?? 0);

    const totalInvalid = (_: number, j: number, val: number) => {
        const sumAlloc = alloc.reduce((s, row) => s + (row[j] ?? 0), 0);
        return sumAlloc > val;
    };

    return (
        <>
            {/* ── Presets ───────────────────────────────────────────────────── */}
            <div className="sidebar-section">
                <div className="section-label">
                    <span>📦</span> Presets
                </div>
                <div className="preset-list">
                    {/* Render only non-custom presets in the standard grid */}
                    {SCENARIOS.filter((s) => !s.isCustom).map((s, idx) => (
                        <button
                            key={idx}
                            className={`preset-btn${!isCustomActive && selectedPreset === idx ? ' active' : ''
                                }`}
                            onClick={() => onPresetSelect(idx)}
                        >
                            <span className="preset-btn-name">{s.name}</span>
                            <span className="preset-btn-desc">{s.description}</span>
                        </button>
                    ))}

                    {/* Custom button — dashed border, pencil icon */}
                    <button
                        id={`preset-btn-${CUSTOM_SCENARIO_IDX}`}
                        className={`preset-btn${isCustomActive ? ' active' : ''}`}
                        onClick={onCustom}
                        style={{
                            border: `1.5px dashed ${isCustomActive ? 'var(--accent-blue)' : 'var(--border-light)'
                                }`,
                        }}
                    >
                        <span
                            className="preset-btn-name"
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <PenLine size={13} />
                            Custom
                        </span>
                        <span className="preset-btn-desc">
                            Start from scratch — blank zero matrices, set your own N &amp; M
                        </span>
                    </button>
                </div>
            </div>

            {/* ── Dimensions ───────────────────────────────────────────────── */}
            <div className="sidebar-section">
                <div className="section-label">
                    <span>⚙️</span> Dimensions
                </div>

                <div className="dim-row">
                    <span className="dim-label">Processes (N)</span>
                    <div className="dim-stepper">
                        <button onClick={() => setN(n - 1)} aria-label="Decrease N" disabled={n <= 1}>
                            <Minus size={13} />
                        </button>
                        <span>{n}</span>
                        <button onClick={() => setN(n + 1)} aria-label="Increase N" disabled={n >= 8}>
                            <Plus size={13} />
                        </button>
                    </div>
                </div>

                <div className="dim-row">
                    <span className="dim-label">Resources (M)</span>
                    <div className="dim-stepper">
                        <button onClick={() => setM(m - 1)} aria-label="Decrease M" disabled={m <= 1}>
                            <Minus size={13} />
                        </button>
                        <span>{m}</span>
                        <button onClick={() => setM(m + 1)} aria-label="Increase M" disabled={m >= 6}>
                            <Plus size={13} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Total Resources ───────────────────────────────────────────── */}
            <MatrixEditor
                label="Total Resources"
                rows={1}
                cols={m}
                data={[total]}
                onChange={handleTotalChange}
                isInvalid={totalInvalid}
                is1D
            />

            {/* ── Max Demand ───────────────────────────────────────────────── */}
            <MatrixEditor
                label="Max Demand Matrix"
                rows={n}
                cols={m}
                data={max}
                onChange={(next) => onChange({ max: next })}
            />

            {/* ── Allocation ───────────────────────────────────────────────── */}
            <MatrixEditor
                label="Current Allocation"
                rows={n}
                cols={m}
                data={alloc}
                onChange={(next) => onChange({ alloc: next })}
                isInvalid={allocInvalid}
            />
        </>
    );
};

export default ScenarioEditor;
