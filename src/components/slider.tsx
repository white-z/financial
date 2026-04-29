"use client";

import * as React from "react";

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  className?: string;
  value: [number, number];
  onValueChange?: (value: [number, number]) => void;
}

export const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step = 1,
  className,
  value,
  onValueChange,
}) => {
  const [start, end] = value;
  const range = max - min;

  const startPct = ((start - min) / range) * 100;
  const endPct = ((end - min) / range) * 100;

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let next = Number(e.target.value);
    if (!Number.isFinite(next)) return;
    next = Math.max(min, Math.min(next, end - step));
    onValueChange?.([next, end]);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let next = Number(e.target.value);
    if (!Number.isFinite(next)) return;
    next = Math.min(max, Math.max(next, start + step));
    onValueChange?.([start, next]);
  };

  return (
    <div className={className}>
      <style>{`
        .slider-range-input {
          -webkit-appearance: none;
          appearance: none;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          background: transparent;
          margin: 0;
          cursor: pointer;
        }
        .slider-range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid rgba(0,229,255,0.8);
          box-shadow: 0 0 6px rgba(0,229,255,0.4);
          pointer-events: all;
          cursor: grab;
          transition: box-shadow 0.15s, transform 0.15s;
        }
        .slider-range-input::-webkit-slider-thumb:hover {
          box-shadow: 0 0 10px rgba(0,229,255,0.7);
          transform: scale(1.15);
        }
        .slider-range-input::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.2);
        }
        .slider-range-input::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid rgba(0,229,255,0.8);
          box-shadow: 0 0 6px rgba(0,229,255,0.4);
          pointer-events: all;
          cursor: grab;
        }
      `}</style>

      {/* Track container */}
      <div className="relative" style={{ height: 28 }}>
        {/* Background rail */}
        <div
          className="absolute left-0 right-0 rounded-full"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            height: 4,
            background: "rgba(255,255,255,0.08)",
          }}
        />
        {/* Active range fill */}
        <div
          className="absolute rounded-full"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            height: 4,
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
            background: "linear-gradient(90deg, #00C4D4, #00E5FF)",
            boxShadow: "0 0 6px rgba(0,229,255,0.35)",
          }}
        />

        {/* Start thumb input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={start}
          onChange={handleStartChange}
          className="slider-range-input"
          style={{ zIndex: start > max - (max - min) * 0.1 ? 5 : 3 }}
        />

        {/* End thumb input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={end}
          onChange={handleEndChange}
          className="slider-range-input"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  );
};
