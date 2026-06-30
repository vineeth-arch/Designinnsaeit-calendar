"use client";

import qrcode from "qrcode";
import { useMemo } from "react";

import classNames from "@calcom/ui/classNames";

const FINDER = 7; // finder-pattern ("eye") size in modules
const CELL = 4; // svg units per module

interface BookingQRCodeProps {
  /** The URL the QR encodes (e.g. the booking-detail link). */
  value: string;
  className?: string;
  /** Fill behind the centre brand drop so it reads as a clean hole. Defaults to the page bg token. */
  centerBg?: string;
}

/**
 * Brand-styled QR: rounded modules, rounded finder "eyes" with accent pips and a centre brand drop.
 * Modules render in `currentColor` (so the parent keeps them high-contrast for reliable scanning); the
 * accent pops use the brand token. Error-correction H keeps it scannable despite the centre logo.
 */
export const BookingQRCode = ({ value, className, centerBg = "var(--cal-bg)" }: BookingQRCodeProps) => {
  const matrix = useMemo(() => {
    try {
      const qr = qrcode.create(value, { errorCorrectionLevel: "H" });
      const size = qr.modules.size;
      const data = qr.modules.data;
      const eyes: Array<[number, number]> = [
        [0, 0],
        [0, size - FINDER],
        [size - FINDER, 0],
      ];
      const inEye = (r: number, c: number) =>
        eyes.some(([er, ec]) => r >= er && r < er + FINDER && c >= ec && c < ec + FINDER);
      const lo = Math.floor(size / 2) - 2;
      const hi = Math.floor(size / 2) + 2;
      const inCenter = (r: number, c: number) => r >= lo && r <= hi && c >= lo && c <= hi;

      const dots: Array<{ r: number; c: number }> = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!data[r * size + c] || inEye(r, c) || inCenter(r, c)) continue;
          dots.push({ r, c });
        }
      }
      return { size, dots, eyes };
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) return null;

  const { size, dots, eyes } = matrix;
  const dim = size * CELL;
  const lc = dim / 2;
  const lr = dim * 0.1;

  return (
    <svg
      viewBox={`0 0 ${dim} ${dim}`}
      className={classNames("h-full w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true">
      <g fill="currentColor">
        {dots.map(({ r, c }) => (
          <circle key={`${r}-${c}`} cx={c * CELL + CELL / 2} cy={r * CELL + CELL / 2} r={CELL * 0.42} />
        ))}
      </g>
      {eyes.map(([er, ec]) => {
        const x = ec * CELL;
        const y = er * CELL;
        return (
          <g key={`eye-${er}-${ec}`}>
            <rect
              x={x + CELL * 0.5}
              y={y + CELL * 0.5}
              width={6 * CELL}
              height={6 * CELL}
              rx={2 * CELL}
              fill="none"
              stroke="currentColor"
              strokeWidth={CELL}
            />
            <rect
              x={x + 2.5 * CELL}
              y={y + 2.5 * CELL}
              width={2 * CELL}
              height={2 * CELL}
              rx={CELL}
              fill="var(--cal-brand)"
            />
          </g>
        );
      })}
      <circle cx={lc} cy={lc} r={lr * 1.7} fill={centerBg} />
      <circle cx={lc} cy={lc} r={lr} fill="var(--cal-brand)" />
      <circle cx={lc + lr * 0.34} cy={lc - lr * 0.34} r={lr * 0.36} fill={centerBg} />
    </svg>
  );
};
