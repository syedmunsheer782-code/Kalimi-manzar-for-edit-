import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Copy,
  Diamond,
  Film,
  Image as ImageIcon,
  PictureInPicture2,
  Plus,
  Scissors,
  Share2,
  Snowflake,
  Sparkles,
  Trash2,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AspectRatioId,
  AudioNRConfig,
  MediaClip,
  PipLayer,
  SocialAnimationLayer,
  TextLayer,
} from '../types/editor';
import {getTotalTimelineDuration} from '../utils/canvasEngine';

const QUICK_ASPECT_RATIOS: AspectRatioId[] = ['9:16', '16:9', '1:1', '4:5'];

interface TimelineProps {
  clips: MediaClip[];
  pipLayers: PipLayer[];
  socialLayers: SocialAnimationLayer[];
  textLayers: TextLayer[];
  audioNR: AudioNRConfig;
  aspectRatio: AspectRatioId;
  activeClipId: string | null;
  activeClipMuted: boolean;
  activePipId: string | null;
  activeSocialId: string | null;
  activeTextId: string | null;
  currentTime: number;
  onSeek: (time: number) => void;
  onSelectClip: (clipId: string) => void;
  onSelectPip: (pipId: string) => void;
  onSelectSocial: (socialId: string) => void;
  onSelectTransition: (clipId: string) => void;
  onSelectText: (textId: string) => void;
  onAddMediaClick: () => void;
  onAddPipClick: () => void;
  onSplitClip: () => void;
  onFreezeFrame: () => void;
  onToggleMuteClip: () => void;
  onDuplicateClip: () => void;
  onDeleteClip: (clipId: string) => void;
  onChangeAspectRatio: (ar: AspectRatioId) => void;
  onOpenAudioTool: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  clips,
  pipLayers,
  socialLayers,
  textLayers,
  audioNR,
  aspectRatio,
  activeClipId,
  activeClipMuted,
  activePipId,
  activeSocialId,
  activeTextId,
  currentTime,
  onSeek,
  onSelectClip,
  onSelectPip,
  onSelectSocial,
  onSelectTransition,
  onSelectText,
  onAddMediaClick,
  onAddPipClick,
  onSplitClip,
  onFreezeFrame,
  onToggleMuteClip,
  onDuplicateClip,
  onDeleteClip,
  onChangeAspectRatio,
  onOpenAudioTool,
}) => {
  const trackScrollRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(640);
  const isProgrammaticScrollRef = useRef(false);
  const clearProgrammaticRafRef = useRef<number | null>(null);
  const dragPanRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const totalDuration = Math.max(1, getTotalTimelineDuration(clips));
  const pxPerSec = 58;
  const contentWidth = Math.max(240, Math.ceil(totalDuration * pxPerSec) + 96);
  const halfW = Math.max(120, Math.floor(viewportWidth / 2));

  // Track scrollable viewport width so the fixed white center playhead stays exact on any screen size
  useEffect(() => {
    const el = trackScrollRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (el.clientWidth > 0) setViewportWidth(el.clientWidth);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync currentTime -> scrollLeft when playing or jumping programmatically (InShot fixed center line)
  useEffect(() => {
    const el = trackScrollRef.current;
    if (!el) return;
    if (dragPanRef.current) return;
    const targetScroll = Math.max(0, Math.min(totalDuration * pxPerSec, currentTime * pxPerSec));
    if (Math.abs(el.scrollLeft - targetScroll) > 1.5) {
      isProgrammaticScrollRef.current = true;
      el.scrollLeft = targetScroll;
      if (clearProgrammaticRafRef.current) {
        cancelAnimationFrame(clearProgrammaticRafRef.current);
      }
      clearProgrammaticRafRef.current = requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
      });
    }
  }, [currentTime, totalDuration, pxPerSec, halfW]);

  // Native smooth touch / wheel / drag scroll moves video track underneath fixed white center line
  const handleTrackScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const el = trackScrollRef.current;
    if (!el) return;
    const nextTime = Math.max(0, Math.min(totalDuration, el.scrollLeft / pxPerSec));
    onSeek(Number(nextTime.toFixed(2)));
  }, [onSeek, pxPerSec, totalDuration]);

  // Desktop click-and-drag horizontal track panning (smooth InShot drag feel on mouse too)
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Let native touch scrolling handle touch gestures effortlessly with momentum
    if (e.pointerType === 'touch') return;
    if (e.button !== 0) return;
    const el = trackScrollRef.current;
    if (!el) return;
    dragPanRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = dragPanRef.current;
    const el = trackScrollRef.current;
    if (!pan || !el || pan.pointerId !== e.pointerId) return;
    const dx = e.clientX - pan.startX;
    if (!pan.moved && Math.abs(dx) > 4) {
      pan.moved = true;
      suppressClickRef.current = true;
      el.setPointerCapture(e.pointerId);
    }
    if (pan.moved) {
      el.scrollLeft = Math.max(0, Math.min(totalDuration * pxPerSec, pan.startScrollLeft - dx));
    }
  };

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = dragPanRef.current;
    const el = trackScrollRef.current;
    if (pan && pan.pointerId === e.pointerId) {
      if (pan.moved && el && el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      dragPanRef.current = null;
      if (suppressClickRef.current) {
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 40);
      }
    }
  };

  // Precompute clip start times
  let cursor = 0;
  const clipRanges = clips.map((c) => {
    const start = cursor;
    cursor += c.duration;
    return {clip: c, start, end: cursor};
  });

  const rulerTicks: number[] = [];
  for (let s = 0; s <= Math.ceil(totalDuration); s++) {
    rulerTicks.push(s);
  }

  return (
    <div className="bg-[#090909] border-t border-white/10 flex flex-col select-none">
      {/* Compact Timeline Action Bar: Split Clip, Freeze Frame, Mute Clip & Aspect Ratio Presets */}
      <div className="flex items-center justify-between gap-2 px-3 min-h-[42px] py-1 border-b border-white/8 bg-[#0c0c0c] overflow-x-auto studio-scroll">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onAddMediaClick}
            className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Media</span>
          </button>
          <button
            type="button"
            onClick={onSplitClip}
            disabled={!activeClipId}
            className="inline-flex items-center gap-1 min-h-[32px] px-2.5 rounded-md bg-[#161616] border border-white/15 text-xs font-medium text-neutral-100 hover:bg-white hover:text-black disabled:opacity-35 transition-colors cursor-pointer whitespace-nowrap"
            title="Split clip at center white line"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
          <button
            type="button"
            onClick={onFreezeFrame}
            disabled={!activeClipId}
            className="inline-flex items-center gap-1 min-h-[32px] px-2.5 rounded-md bg-[#161616] border border-white/12 text-xs font-medium text-neutral-200 hover:bg-white hover:text-black disabled:opacity-35 transition-colors cursor-pointer whitespace-nowrap"
            title="Insert 3.0s Freeze Frame at playhead"
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span>Freeze</span>
          </button>
          <button
            type="button"
            onClick={onToggleMuteClip}
            disabled={!activeClipId}
            className={`inline-flex items-center gap-1 min-h-[32px] px-2.5 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap disabled:opacity-35 ${
              activeClipMuted
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-[#161616] text-neutral-200 border-white/12 hover:bg-white hover:text-black'
            }`}
            title={activeClipMuted ? 'Unmute selected clip' : 'Mute selected clip'}
            aria-pressed={activeClipMuted}
          >
            {activeClipMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{activeClipMuted ? 'Muted' : 'Mute Clip'}</span>
          </button>
          <button
            type="button"
            onClick={onDuplicateClip}
            disabled={!activeClipId}
            className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded-md text-xs text-neutral-300 hover:text-white hover:bg-white/10 disabled:opacity-35 transition-colors cursor-pointer whitespace-nowrap"
            title="Duplicate selected clip"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Duplicate</span>
          </button>
          <button
            type="button"
            onClick={() => activeClipId && onDeleteClip(activeClipId)}
            disabled={clips.length <= 1 || !activeClipId}
            className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded-md text-xs text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer whitespace-nowrap"
            title="Delete selected clip"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* One-Tap Aspect Ratio Preset Buttons (9:16, 16:9, 1:1, 4:5) */}
          <div
            role="group"
            aria-label="Aspect ratio presets"
            className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#141414] border border-white/10"
          >
            {QUICK_ASPECT_RATIOS.map((ar) => {
              const active = aspectRatio === ar;
              return (
                <button
                  key={ar}
                  type="button"
                  onClick={() => onChangeAspectRatio(ar)}
                  className={`min-h-[26px] px-2 rounded-md text-[11px] font-mono-num transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white text-black font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title={`Set aspect ratio to ${ar}`}
                >
                  {ar}
                </button>
              );
            })}
          </div>

          <div className="hidden 2xl:flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono-num whitespace-nowrap">
            <span>{clips.length} clips</span>
            <span aria-hidden="true">·</span>
            <span>{pipLayers.length} PIP</span>
            <span aria-hidden="true">·</span>
            <span>{textLayers.length} text</span>
          </div>
        </div>
      </div>

      {/* InShot-Style Scrollable Track Viewport with Fixed White Center Playhead Line */}
      <div className="relative overflow-hidden">
        {/* Crisp Fixed White Center Playhead (locked dead-center while tracks glide smoothly underneath) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
        >
          <div className="px-1.5 py-0.5 rounded-b bg-white text-black text-[9px] font-bold font-mono-num leading-none shadow-md">
            {currentTime.toFixed(2)}s
          </div>
          <div className="w-[2px] flex-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.85)]" />
        </div>

        {/* Smooth Horizontal Scrollable Multi-Track Canvas */}
        <div
          ref={trackScrollRef}
          onScroll={handleTrackScroll}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          onPointerCancel={handleTrackPointerUp}
          className="relative overflow-x-auto studio-scroll py-2 cursor-grab active:cursor-grabbing"
          style={{WebkitOverflowScrolling: 'touch'}}
        >
          <div
            className="relative box-content"
            style={{
              width: `${contentWidth}px`,
              paddingLeft: `${halfW}px`,
              paddingRight: `${halfW}px`,
            }}
          >
            {/* Time Ruler */}
            <div className="relative h-6 border-b border-white/10">
              {rulerTicks.map((sec) => (
                <div
                  key={sec}
                  className="absolute top-0 bottom-0 flex flex-col justify-end"
                  style={{left: `${sec * pxPerSec}px`}}
                >
                  <span className="text-[10px] font-mono-num text-neutral-500 pl-1 leading-none mb-1">
                    {sec}s
                  </span>
                  <div className="w-px h-2 bg-white/25" />
                </div>
              ))}
            </div>

            {/* Track 1: Main Video / Photo Clips + CapCut Transition Junctions + Keyframe Diamonds */}
            <div className="relative h-14 mt-1.5 flex items-center">
              {clipRanges.map(({clip, start}, idx) => {
                const widthPx = Math.max(48, clip.duration * pxPerSec);
                const isSelected = clip.id === activeClipId;
                const hasNext = idx < clipRanges.length - 1;
                return (
                  <React.Fragment key={clip.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (suppressClickRef.current) return;
                        onSelectClip(clip.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') onSelectClip(clip.id);
                      }}
                      className={`relative h-12 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer group ${
                        isSelected
                          ? 'border-white ring-1 ring-white/80 z-10'
                          : 'border-white/15 hover:border-white/40'
                      }`}
                      style={{width: `${widthPx}px`}}
                    >
                      {clip.kind === 'photo' ? (
                        <img
                          src={clip.processedSrc ?? clip.src}
                          alt={clip.name}
                          referrerPolicy="no-referrer"
                          draggable={false}
                          className="w-full h-full object-cover opacity-75 group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                          <Film className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}

                      {/* Scrim + Clip Label + Mute Badge */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent px-2 py-1 flex flex-col justify-between pointer-events-none">
                        <div className="flex items-center justify-between gap-1 text-[10px] text-white/90">
                          <span className="inline-flex items-center gap-1 truncate max-w-[70%]">
                            {clip.kind === 'video' ? (
                              <Film className="w-2.5 h-2.5 shrink-0" />
                            ) : (
                              <ImageIcon className="w-2.5 h-2.5 shrink-0" />
                            )}
                            <span className="truncate">{clip.name}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono-num text-neutral-300 shrink-0">
                            {clip.muted && <VolumeX className="w-2.5 h-2.5 text-white" />}
                            <span>{clip.duration.toFixed(1)}s</span>
                          </span>
                        </div>
                      </div>

                      {/* Keyframe Diamond Markers on Clip */}
                      {clip.keyframes.map((kf) => {
                        const pct = Math.max(4, Math.min(96, (kf.time / clip.duration) * 100));
                        return (
                          <button
                            key={kf.id}
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (suppressClickRef.current) return;
                              onSelectClip(clip.id);
                              onSeek(Number((start + kf.time).toFixed(2)));
                            }}
                            style={{left: `${pct}%`}}
                            className="absolute bottom-1 -translate-x-1/2 p-0.5 text-white hover:scale-125 transition-transform cursor-pointer z-20"
                            title={`Keyframe at ${kf.time.toFixed(2)}s (${kf.easing})`}
                          >
                            <Diamond className="w-2.5 h-2.5 fill-white stroke-black stroke-[1.5]" />
                          </button>
                        );
                      })}
                    </div>

                    {/* CapCut-Style Transition Junction Button between Clips */}
                    {hasNext && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (suppressClickRef.current) return;
                          onSelectTransition(clip.id);
                        }}
                        className={`relative -mx-3 z-20 w-6 h-6 rounded-md flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
                          clip.transitionOut !== 'none'
                            ? 'bg-white text-black border-black shadow-md'
                            : 'bg-[#181818] text-neutral-300 border-white/30 hover:bg-white hover:text-black'
                        }`}
                        title={`Transition: ${clip.transitionOut} (${clip.transitionDuration}s)`}
                        aria-label={`Edit transition after ${clip.name}`}
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Prominent '+' button on the right side of the video timeline to append clips */}
              <button
                type="button"
                onClick={() => {
                  if (suppressClickRef.current) return;
                  onAddMediaClick();
                }}
                className="ml-2.5 h-12 min-w-[48px] px-3 rounded-xl bg-white text-black border border-white flex items-center justify-center gap-1 hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shrink-0 shadow-lg"
                title="Add more video or photo clips"
                aria-label="Append video or photo clip"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Track 2: Dedicated PIP (Picture-in-Picture / Video Overlay) Track */}
            <div className="relative h-8 mt-1.5 flex items-center">
              {pipLayers.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    onAddPipClick();
                  }}
                  className="h-full px-2.5 rounded-md border border-dashed border-white/20 bg-[#101010] hover:border-white/50 hover:text-white text-neutral-400 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PictureInPicture2 className="w-3.5 h-3.5" />
                  <span>+ Add PIP Overlay</span>
                </button>
              ) : (
                <>
                  {pipLayers.map((pip) => {
                    const leftPx = pip.startTime * pxPerSec;
                    const widthPx = Math.max(54, pip.duration * pxPerSec);
                    const selected = pip.id === activePipId;
                    return (
                      <button
                        key={pip.id}
                        type="button"
                        onClick={() => {
                          if (suppressClickRef.current) return;
                          onSelectPip(pip.id);
                        }}
                        style={{left: `${leftPx}px`, width: `${widthPx}px`}}
                        className={`absolute top-0 bottom-0 rounded-md px-2 flex items-center justify-between gap-1.5 text-[11px] font-medium truncate border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-white text-black border-white shadow-sm z-10'
                            : 'bg-[#1a1a1a] text-neutral-100 border-white/25 hover:border-white/55'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <PictureInPicture2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{pip.name}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono-num shrink-0 opacity-75">
                          {pip.muted && <VolumeX className="w-2.5 h-2.5" />}
                          <span>{pip.duration.toFixed(1)}s</span>
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      if (suppressClickRef.current) return;
                      onAddPipClick();
                    }}
                    style={{
                      left: `${
                        Math.max(
                          ...pipLayers.map((p) => (p.startTime + p.duration) * pxPerSec),
                          0,
                        ) + 8
                      }px`,
                    }}
                    className="absolute top-0 bottom-0 px-2 rounded-md border border-dashed border-white/25 bg-[#121212] hover:bg-white hover:text-black text-neutral-300 text-[10px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    title="Add another PIP overlay"
                  >
                    <Plus className="w-3 h-3" />
                    <span>PIP</span>
                  </button>
                </>
              )}
            </div>

            {/* Track 3: Vector Social Animations */}
            {socialLayers.length > 0 && (
              <div className="relative h-7 mt-1">
                {socialLayers.map((sl) => {
                  const leftPx = sl.startTime * pxPerSec;
                  const widthPx = Math.max(58, sl.duration * pxPerSec);
                  const selected = sl.id === activeSocialId;
                  const platformTag =
                    sl.platform === 'youtube' ? 'YT' : sl.platform === 'facebook' ? 'FB' : 'IG';
                  return (
                    <button
                      key={sl.id}
                      type="button"
                      onClick={() => {
                        if (suppressClickRef.current) return;
                        onSelectSocial(sl.id);
                      }}
                      style={{left: `${leftPx}px`, width: `${widthPx}px`}}
                      className={`absolute top-0 bottom-0 rounded-md px-2 flex items-center justify-between gap-1.5 text-[11px] font-medium truncate border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-white text-black border-white z-10'
                          : 'bg-[#1a1a1a] text-neutral-100 border-white/25 hover:border-white/55'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <Share2 className="w-3 h-3 shrink-0" />
                        <span className="font-mono-num text-[10px] opacity-75">{platformTag}</span>
                        <span className="truncate">{sl.title}</span>
                      </span>
                      <span className="text-[10px] font-mono-num opacity-75 shrink-0">
                        {sl.duration.toFixed(1)}s
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Track 4: Text Layers */}
            {textLayers.length > 0 && (
              <div className="relative h-7 mt-1">
                {textLayers.map((tl) => {
                  const leftPx = tl.startTime * pxPerSec;
                  const widthPx = Math.max(44, tl.duration * pxPerSec);
                  const selected = tl.id === activeTextId;
                  return (
                    <button
                      key={tl.id}
                      type="button"
                      onClick={() => {
                        if (suppressClickRef.current) return;
                        onSelectText(tl.id);
                      }}
                      style={{left: `${leftPx}px`, width: `${widthPx}px`}}
                      className={`absolute top-0 bottom-0 rounded-md px-2 flex items-center gap-1.5 text-[11px] font-medium truncate border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-white text-black border-white'
                          : 'bg-[#1b1b1b] text-neutral-200 border-white/15 hover:border-white/40'
                      }`}
                    >
                      <Type className="w-3 h-3 shrink-0" />
                      <span className="truncate">{tl.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Track 4: Audio / Voice NR Strip */}
            <div className="relative h-6 mt-1">
              <button
                type="button"
                onClick={() => {
                  if (suppressClickRef.current) return;
                  onOpenAudioTool();
                }}
                style={{width: `${Math.max(180, totalDuration * pxPerSec)}px`}}
                className={`h-full rounded-md px-2.5 flex items-center justify-between text-[11px] border transition-colors cursor-pointer ${
                  audioNR.enabled
                    ? 'bg-white/12 text-white border-white/35'
                    : 'bg-[#121212] text-neutral-400 border-white/10 hover:border-white/25'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 truncate">
                  <Volume2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {audioNR.trackName ? audioNR.trackName : 'Audio Track'}
                  </span>
                </span>
                <span className="font-mono-num text-[10px]">
                  {audioNR.enabled ? `Voice NR ${audioNR.strength}%` : 'NR Off'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
