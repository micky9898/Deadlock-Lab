/**
 * MatrixEditor.tsx
 * Renders an editable N×M matrix with validation highlighting.
 */
import React from 'react';

interface Props {
    label: string;
    rows: number;
    cols: number;
    data: number[][];
    onChange: (next: number[][]) => void;
    /** Optional per-cell max validator — returns true if the value is invalid */
    isInvalid?: (row: number, col: number, val: number) => boolean;
    rowPrefix?: string;
    colPrefix?: string;
    /** If true, render as a 1-D row (e.g. Total resources or Available) */
    is1D?: boolean;
}

const MatrixEditor: React.FC<Props> = ({
    label,
    rows,
    cols,
    data,
    onChange,
    isInvalid,
    rowPrefix = 'P',
    colPrefix = 'R',
    is1D = false,
}) => {
    const handleChange = (r: number, c: number, raw: string) => {
        const val = parseInt(raw, 10);
        const next = data.map((row) => [...row]);
        next[r][c] = isNaN(val) || val < 0 ? 0 : val;
        onChange(next);
    };

    if (is1D) {
        // Render single-row vector (Total / Available)
        const row = data[0] ?? [];
        return (
            <div className="matrix-section">
                <div className="matrix-label">{label}</div>
                <div className="matrix-table-wrap">
                    <table className="matrix-table">
                        <thead>
                            <tr>
                                {Array.from({ length: cols }, (_, j) => (
                                    <th key={j}>{colPrefix}{j}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                {Array.from({ length: cols }, (_, j) => (
                                    <td key={j}>
                                        <input
                                            type="number"
                                            min={0}
                                            className={`matrix-input${isInvalid && isInvalid(0, j, row[j]) ? ' error' : ''}`}
                                            value={row[j] ?? 0}
                                            onChange={(e) => handleChange(0, j, e.target.value)}
                                            aria-label={`${label} ${colPrefix}${j}`}
                                        />
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="matrix-section">
            <div className="matrix-label">{label}</div>
            <div className="matrix-table-wrap">
                <table className="matrix-table">
                    <thead>
                        <tr>
                            <th></th>
                            {Array.from({ length: cols }, (_, j) => (
                                <th key={j}>{colPrefix}{j}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }, (_, i) => (
                            <tr key={i}>
                                <td className="row-label">{rowPrefix}{i}</td>
                                {Array.from({ length: cols }, (_, j) => (
                                    <td key={j}>
                                        <input
                                            type="number"
                                            min={0}
                                            className={`matrix-input${isInvalid && isInvalid(i, j, data[i]?.[j] ?? 0) ? ' error' : ''}`}
                                            value={data[i]?.[j] ?? 0}
                                            onChange={(e) => handleChange(i, j, e.target.value)}
                                            aria-label={`${label} ${rowPrefix}${i} ${colPrefix}${j}`}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MatrixEditor;
