import React from 'react';
import {TransitionId} from '../types/editor';

interface TransitionPreviewTileProps {
  transitionId: TransitionId;
  active?: boolean;
}

/**
 * Short, continuously looping GIF-style visual preview showing Clip A -> Clip B
 * using hardware-accelerated CSS motion matching each CapCut-style transition.
 */
export const TransitionPreviewTile: React.FC<TransitionPreviewTileProps> = ({
  transitionId,
  active = false,
}) => {
  return (
    <div
      className={`relative w-full h-14 rounded-lg overflow-hidden border bg-black select-none ${
        active ? 'border-black/30' : 'border-white/12'
      }`}
      aria-hidden="true"
    >
      {/* Outgoing Scene A (Dark architectural bars) */}
      <div
        className={`absolute inset-0 flex items-end justify-between px-2 pb-1.5 bg-gradient-to-br from-[#17171b] via-[#27272e] to-[#0a0a0c] tr-a-${transitionId}`}
      >
        <div className="flex items-end gap-1 h-7 opacity-80">
          <span className="w-1.5 h-5 bg-white/35 rounded-t-xs" />
          <span className="w-2 h-7 bg-white/60 rounded-t-xs" />
          <span className="w-1.5 h-4 bg-white/30 rounded-t-xs" />
        </div>
        <span className="font-mono-num text-[9px] font-bold text-white/75 tracking-wider">A</span>
      </div>

      {/* Incoming Scene B (Bright high-contrast horizon circle) */}
      <div
        className={`absolute inset-0 flex items-center justify-between px-2.5 bg-gradient-to-tr from-[#3f3f46] via-[#a1a1aa] to-[#f4f4f5] tr-b-${transitionId}`}
      >
        <div className="w-6 h-6 rounded-full bg-black/80 border border-white/70 shadow-sm" />
        <span className="font-mono-num text-[9px] font-bold text-black/80 tracking-wider">B</span>
      </div>

      {/* Optional Flash / Fade Overlay for flash-white & fade-black */}
      {(transitionId === 'flash-white' || transitionId === 'fade-black') && (
        <div
          className={`absolute inset-0 pointer-events-none ${
            transitionId === 'flash-white'
              ? 'bg-white tr-flash-white'
              : 'bg-black tr-fade-black-overlay'
          }`}
        />
      )}

      {/* Optional Split-Open Center Door overlay */}
      {transitionId === 'split-open' && (
        <>
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[#1a1a1f] border-r border-white/40 tr-split-left" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[#1a1a1f] border-l border-white/40 tr-split-right" />
        </>
      )}
    </div>
  );
};
