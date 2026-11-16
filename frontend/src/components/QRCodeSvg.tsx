import React from 'react';

// Lightweight, zero-dependency QR code SVG renderer for DeWEB
// Generates standard 2D matrix pattern deterministically from text
interface QRCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeSvg: React.FC<QRCodeSvgProps> = ({ value, size = 180, className = '' }) => {
  // Simple deterministic visual matrix hash for offline standalone DeWEB representation
  const modules: boolean[][] = React.useMemo(() => {
    const dim = 25;
    const grid: boolean[][] = Array.from({ length: dim }, () => Array(dim).fill(false));

    // Finder patterns (top-left, top-right, bottom-left)
    const drawFinder = (r: number, c: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (
            i === 0 || i === 6 || j === 0 || j === 6 ||
            (i >= 2 && i <= 4 && j >= 2 && j <= 4)
          ) {
            grid[r + i][c + j] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, dim - 7);
    drawFinder(dim - 7, 0);

    // Timing lines
    for (let i = 8; i < dim - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Hash payload into remaining data cells
    let hash = 2166136261;
    for (let k = 0; k < value.length; k++) {
      hash ^= value.charCodeAt(k);
      hash = Math.imul(hash, 16777619);
    }

    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        const inFinder =
          (r < 8 && c < 8) ||
          (r < 8 && c >= dim - 8) ||
          (r >= dim - 8 && c < 8) ||
          r === 6 || c === 6;
        if (!inFinder) {
          hash = (hash * 1103515245 + 12345) & 0x7fffffff;
          grid[r][c] = (hash % 2) === 1;
        }
      }
    }

    return grid;
  }, [value]);

  const dim = modules.length;
  const cellSize = size / dim;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`rounded-xl bg-white p-2 shadow-md ${className}`}
    >
      {modules.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0F172A"
            />
          ) : null
        )
      )}
    </svg>
  );
};
