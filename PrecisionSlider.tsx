import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Minus, Plus, RotateCcw, SlidersHorizontal} from 'lucide-react';

interface PrecisionSliderProps {
  label: string;
  icon?: React.ComponentType<{className?: string}>;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  showSign?: boolean;
  onChange: (next: number) => void;
}

/**
 * Universal compact monochrome adjustment control (zero traditional slider lines).
 * Features the tool icon directly above, a '-' button on the left, an editable numeric
 * box in the middle (direct mobile keypad input + tap/press-and-hold auto-step counting),
 * and a '+' button on the right.
 */
export const PrecisionSlider: React.FC<PrecisionSliderProps> = ({
  label,
  icon: Icon = SlidersHorizontal,
  value,
  min,
  max,
  step = 1,
  defaultValue = 0,
  unit = '',
  showSign = false,
  onChange,
}) => {
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const holdTicksRef = useRef(0);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const decimals = step < 1 ? (String(step).split('.')[1]?.length ?? 1) : 0;

  const clampAndRound = useCallback(
    (raw: number) => {
      if (!Number.isFinite(raw)) return latestValueRef.current;
      const clamped = Math.max(min, Math.min(max, raw));
      return Number(clamped.toFixed(decimals));
    },
    [min, max, decimals],
  );

  const formatDisplayNumber = useCallback(
    (num: number) => {
      const base = decimals > 0 ? num.toFixed(decimals) : String(Math.round(num));
      const prefix = showSign && num > 0 ? '+' : '';
      return `${prefix}${base}`;
    },
    [decimals, showSign],
  );

  const stopHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdTicksRef.current = 0;
  }, []);

  useEffect(() => stopHold, [stopHold]);

  const startStep = (dir: -1 | 1) => {
    stopHold();
    if (isEditing) {
      setIsEditing(false);
      inputRef.current?.blur();
    }
    const firstNext = clampAndRound(latestValueRef.current + dir * step);
    onChange(firstNext);

    // Smooth press-and-hold auto-step counting with gentle acceleration for long ranges
    holdTimerRef.current = window.setTimeout(() => {
      holdTicksRef.current = 0;
      const runTick = () => {
        holdTicksRef.current += 1;
        const accelMult =
          holdTicksRef.current > 24 && max - min >= 60 ? 2 : 1;
        const next = clampAndRound(latestValueRef.current + dir * step * accelMult);
        onChange(next);
        if ((dir < 0 && next <= min) || (dir > 0 && next >= max)) {
          stopHold();
        }
      };
      holdIntervalRef.current = window.setInterval(runTick, 52);
    }, 260);
  };

  const handleFocus = () => {
    setIsEditing(true);
    setDraft(decimals > 0 ? value.toFixed(decimals) : String(Math.round(value)));
    window.requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  };

  const commitDraft = useCallback(
    (rawStr: string) => {
      const trimmed = rawStr.trim();
      if (trimmed === '' || trimmed === '-' || trimmed === '+' || trimmed === '.') {
        return;
      }
      const parsed = parseFloat(trimmed);
      if (Number.isFinite(parsed)) {
        onChange(clampAndRound(parsed));
      }
    },
    [clampAndRound, onChange],
  );

  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow numeric keypad characters: optional leading +/-, digits, and single decimal point
    const pattern = min < 0 ? /^[+-]?\d*\.?\d*$/ : /^\+?\d*\.?\d*$/;
    if (!pattern.test(raw)) return;
    setDraft(raw);
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && !raw.endsWith('.')) {
      onChange(clampAndRound(parsed));
    }
  };

  const handleBlur = () => {
    commitDraft(draft);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitDraft(draft);
      setIsEditing(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = clampAndRound(latestValueRef.current + step);
      onChange(next);
      setDraft(decimals > 0 ? next.toFixed(decimals) : String(Math.round(next)));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = clampAndRound(latestValueRef.current - step);
      onChange(next);
      setDraft(decimals > 0 ? next.toFixed(decimals) : String(Math.round(next)));
    }
  };

  const isModified = Math.abs(value - defaultValue) > 0.001;
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;

  // Allow smooth horizontal slide/scrub directly across the center box while keeping tap-to-type keypad instant
  const slideRef = useRef<{
    pointerId: number;
    startX: number;
    startVal: number;
    width: number;
    moved: boolean;
  } | null>(null);

  const handleBoxPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEditing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    slideRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startVal: latestValueRef.current,
      width: Math.max(80, rect.width),
      moved: false,
    };
  };

  const handleBoxPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = slideRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const dx = e.clientX - s.startX;
    if (!s.moved && Math.abs(dx) < 6) return;
    if (!s.moved) {
      s.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    }
    const range = max - min;
    const deltaVal = (dx / s.width) * range;
    const snapped = Math.round((s.startVal + deltaVal) / step) * step;
    onChange(clampAndRound(snapped));
  };

  const handleBoxPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = slideRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const didSlide = s.moved;
    slideRef.current = null;
    if (!didSlide) {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-1">
      {/* Tool icon directly above the compact stepper */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
              isModified
                ? 'bg-white text-black border-white'
                : 'bg-[#171717] text-neutral-200 border-white/15'
            }`}
            aria-hidden="true"
          >
            <Icon className="w-3 h-3 stroke-[2.1]" />
          </span>
          <span className="text-[11px] font-medium text-neutral-200 tracking-wide truncate">
            {label}
          </span>
        </div>

        {isModified && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono-num text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title={`Reset ${label} to ${defaultValue}`}
            aria-label={`Reset ${label}`}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>
              {defaultValue}
              {unit}
            </span>
          </button>
        )}
      </div>

      {/* Compact Slide + '-' [Editable Keypad Number] '+' control */}
      <div
        className={`flex items-center rounded-xl border bg-[#111111] p-0.5 gap-1 transition-colors ${
          isEditing
            ? 'border-white'
            : isModified
              ? 'border-white/30'
              : 'border-white/12'
        }`}
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            startStep(-1);
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
          disabled={value <= min}
          className="min-w-[40px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#191919] border border-white/10 text-white hover:bg-white hover:text-black active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer select-none touch-none shrink-0"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="w-3.5 h-3.5 stroke-[2.4]" />
        </button>

        <div
          onPointerDown={handleBoxPointerDown}
          onPointerMove={handleBoxPointerMove}
          onPointerUp={handleBoxPointerUp}
          onPointerCancel={() => {
            slideRef.current = null;
          }}
          onDoubleClick={() => onChange(defaultValue)}
          className="relative flex-1 min-w-0 min-h-[36px] px-2 rounded-lg bg-[#080808] border border-white/8 flex items-center justify-center gap-0.5 cursor-ew-resize overflow-hidden touch-none"
          title={`Slide horizontally or tap to type ${label} (${min} to ${max}) · double-tap to reset`}
        >
          {/* Subtle hairline slide progress bar at bottom edge */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-[2px] bg-white/55 transition-[width] duration-75"
            style={{width: `${pct}%`}}
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            value={isEditing ? draft : formatDisplayNumber(value)}
            onFocus={handleFocus}
            onChange={handleDraftChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            aria-label={label}
            className={`w-full bg-transparent text-center font-mono-num text-xs font-semibold focus:outline-none ${
              isModified || isEditing ? 'text-white' : 'text-neutral-300'
            }`}
          />
          {unit && (
            <span className="font-mono-num text-[11px] text-neutral-500 select-none shrink-0">
              {unit}
            </span>
          )}
        </div>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            startStep(1);
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
          disabled={value >= max}
          className="min-w-[40px] min-h-[36px] flex items-center justify-center rounded-lg bg-[#191919] border border-white/10 text-white hover:bg-white hover:text-black active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer select-none touch-none shrink-0"
          aria-label={`Increase ${label}`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
        </button>
      </div>
    </div>
  );
};
