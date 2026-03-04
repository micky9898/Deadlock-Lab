/**
 * MatrixDisplay.tsx
 * Read-only matrix table for showing Available, Alloc, Need in the output panel.
 */
import React from 'react';

interface Props {
    title: string;
    headers: string[];   // column headers
    rowLabels: string[]; // row labels (process names)
    data: number[][];
    /** Optional highlighter: returns CSS class for the cell */
    cellClass?: (row: number, col: number, val: number) => string;
}

const MatrixDisplay: React.FC<Props> = ({ title, headers, rowLabels, data, cellClass }) => (
    <div className="matrix-display">
        <div className="matrix-display-header">{title}</div>
        <table>
            <thead>
                <tr>
                    <th></th>
                    {headers.map((h, j) => <th key={j}>{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {rowLabels.map((label, i) => (
                    <tr key={i}>
                        <th style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{label}</th>
                        {data[i]?.map((v, j) => (
                            <td key={j} className={cellClass ? cellClass(i, j, v) : ''}>
                                {v}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default MatrixDisplay;
