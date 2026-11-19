import React, {useEffect, useState} from 'react';
import {
  ArrowLeftRight,
  ArrowUpDown,
  BadgeCheck,
  Clock,
  Eye,
  Gauge,
  MousePointerClick,
  Plus,
  RotateCcw,
  Share2,
  ThumbsUp,
  Timer,
  Trash2,
  ZoomIn,
} from 'lucide-react';
import {
  SocialAnimationLayer,
  SocialPlatformId,
  SocialThemeStyle,
} from '../../types/editor';
import {SOCIAL_PRESETS} from '../../utils/socialVectorRenderer';
import {PrecisionSlider} from '../PrecisionSlider';
import {SocialVectorGraphic} from '../SocialVectorGraphic';

interface SocialStudioPanelProps {
  socialLayers: SocialAnimationLayer[];
  activeSocialId: string | null;
  totalDuration: number;
  onSelectSocial: (id: string) => void;
  onAddSocialPreset: (platform: SocialPlatformId) => void;
  onUpdateSocial: (id: string, patch: Partial<SocialAnimationLayer>) => void;
  onDeleteSocial: (id: string) => void;
}

const POSITION_PRESETS: {label: string; x: number; y: number}[] = [
  {label: 'Top L', x: 26, y: 16},
  {label: 'Top C', x: 50, y: 16},
  {label: 'Center', x: 50, y: 50},
  {label: 'Bot L', x: 26, y: 82},
  {label: 'Bot C', x: 50, y: 82},
];

const THEME_STYLES: {id: SocialThemeStyle; label: string}[] = [
  {id: 'brand', label: 'Brand Crisp'},
  {id: 'mono-dark', label: 'Mono Black'},
  {id: 'mono-light', label: 'Mono White'},
];

export const SocialStudioPanel: React.FC<SocialStudioPanelProps> = ({
  socialLayers,
  activeSocialId,
  totalDuration,
  onSelectSocial,
  onAddSocialPreset,
  onUpdateSocial,
  onDeleteSocial,
}) => {
  // Smooth live loop clock for crisp SVG preset previews inside the inspector
  const [previewClock, setPreviewClock] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setPreviewClock((now - start) / 1000);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const activeSocial =
    socialLayers.find((s) => s.id === activeSocialId) ?? socialLayers[0] ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Vector Social Animations</h3>
        <p className="text-xs text-neutral-400">
          100% transparent SVG overlays · no background box · crisp at 1080p &amp; 4K
        </p>
      </div>

      {/* Live Animated Vector Preset Cards (YouTube, Facebook, Instagram) */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-neutral-400">
          Tap to add transparent animation onto video
        </span>
        <div className="space-y-2">
          {SOCIAL_PRESETS.map((preset) => {
            const previewLayer: SocialAnimationLayer = {
              ...preset.defaults,
              id: `preview-${preset.platform}`,
              startTime: 0,
              duration: 4,
            };
            return (
              <button
                key={preset.platform}
                type="button"
                onClick={() => onAddSocialPreset(preset.platform)}
                className="w-full p-2.5 rounded-xl bg-[#101010] border border-white/12 hover:border-white/50 text-left transition-all cursor-pointer group space-y-2"
              >
                <div className="w-full rounded-lg alpha-checker border border-white/10 px-3 py-2.5 flex items-center justify-center overflow-hidden">
                  <div className="w-full max-w-[270px]">
                    <SocialVectorGraphic
                      layer={previewLayer}
                      globalTime={previewClock}
                      previewLoop
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {preset.label}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      {preset.description}
                    </div>
                  </div>
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Social Overlay Selector */}
      {socialLayers.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">
              Active Overlays ({socialLayers.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto studio-scroll pb-1">
            {socialLayers.map((item) => {
              const selected = activeSocial?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`inline-flex items-center rounded-lg border shrink-0 transition-colors ${
                    selected
                      ? 'bg-white text-black border-white'
                      : 'bg-[#141414] text-neutral-300 border-white/12'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSocial(item.id)}
                    className="px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 max-w-[160px] truncate cursor-pointer"
                  >
                    <Share2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSocial(item.id)}
                    className={`p-1.5 rounded-r-lg cursor-pointer ${
                      selected
                        ? 'text-neutral-700 hover:text-black'
                        : 'text-neutral-500 hover:text-white'
                    }`}
                    aria-label={`Remove ${item.title}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Social Overlay Editor */}
      {activeSocial && (
        <div className="space-y-4 pt-2 border-t border-white/10">
          {/* Channel / Name / Handle Inputs */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="social-title-input"
                className="text-xs font-medium text-neutral-300"
              >
                {activeSocial.platform === 'youtube'
                  ? 'YouTube Channel Name'
                  : activeSocial.platform === 'facebook'
                    ? 'Facebook Name (Shown First)'
                    : 'Instagram Handle'}
              </label>
              {activeSocial.platform === 'instagram' &&
                activeSocial.title !== 'kalam_e_aamiria' && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSocial(activeSocial.id, {title: 'kalam_e_aamiria'})
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>kalam_e_aamiria</span>
                  </button>
                )}
            </div>
            <input
              id="social-title-input"
              type="text"
              value={activeSocial.title}
              onChange={(e) =>
                onUpdateSocial(activeSocial.id, {title: e.target.value})
              }
              className="w-full min-h-[38px] px-3 rounded-lg bg-[#141414] border border-white/15 text-xs text-white focus:border-white focus:outline-none"
              placeholder={
                activeSocial.platform === 'instagram'
                  ? 'kalam_e_aamiria'
                  : 'Enter channel or page name'
              }
            />

            <input
              type="text"
              value={activeSocial.subtitle}
              onChange={(e) =>
                onUpdateSocial(activeSocial.id, {subtitle: e.target.value})
              }
              className="w-full min-h-[36px] px-3 rounded-lg bg-[#121212] border border-white/10 text-xs text-neutral-300 focus:border-white focus:outline-none"
              placeholder="Subtitle (optional)"
              aria-label="Social overlay subtitle"
            />
          </div>

          {/* Vector Style Selector */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-neutral-400">Vector Style</span>
            <div className="grid grid-cols-3 gap-1.5">
              {THEME_STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onUpdateSocial(activeSocial.id, {themeStyle: st.id})}
                  className={`min-h-[34px] rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    activeSocial.themeStyle === st.id
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-[#121212] text-neutral-300 border-white/10 hover:border-white/35'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Vector Feature Toggles */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() =>
                onUpdateSocial(activeSocial.id, {verified: !activeSocial.verified})
              }
              className={`min-h-[36px] px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeSocial.verified
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-[#121212] text-neutral-300 border-white/12 hover:border-white/35'
              }`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>Verified Badge</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateSocial(activeSocial.id, {showCursor: !activeSocial.showCursor})
              }
              className={`min-h-[36px] px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeSocial.showCursor
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-[#121212] text-neutral-300 border-white/12 hover:border-white/35'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>Click Cursor</span>
            </button>
            {activeSocial.platform === 'youtube' && (
              <button
                type="button"
                onClick={() =>
                  onUpdateSocial(activeSocial.id, {
                    showActions: !activeSocial.showActions,
                  })
                }
                className={`col-span-2 min-h-[36px] px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeSocial.showActions
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#121212] text-neutral-300 border-white/12 hover:border-white/35'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Like, Comment &amp; Share Bar</span>
              </button>
            )}
          </div>

          {/* Quick Placement */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-neutral-400">
              Quick Placement (or drag directly on video)
            </span>
            <div className="grid grid-cols-5 gap-1">
              {POSITION_PRESETS.map((pos) => (
                <button
                  key={pos.label}
                  type="button"
                  onClick={() =>
                    onUpdateSocial(activeSocial.id, {x: pos.x, y: pos.y})
                  }
                  className="min-h-[32px] rounded-lg bg-[#141414] border border-white/10 hover:bg-white hover:text-black text-[11px] font-medium text-neutral-200 transition-colors cursor-pointer"
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Crisp Precision Sliders with Standard Icons Above Every Bar */}
          <div className="space-y-3.5">
            <PrecisionSlider
              label="Vector Scale"
              icon={ZoomIn}
              value={Math.round(activeSocial.scale > 0 ? activeSocial.scale : 100)}
              min={30}
              max={200}
              step={1}
              defaultValue={100}
              unit="%"
              onChange={(v) => onUpdateSocial(activeSocial.id, {scale: v})}
            />
            <PrecisionSlider
              label="Position X"
              icon={ArrowLeftRight}
              value={activeSocial.x}
              min={10}
              max={90}
              step={1}
              defaultValue={50}
              unit="%"
              onChange={(v) => onUpdateSocial(activeSocial.id, {x: v})}
            />
            <PrecisionSlider
              label="Position Y"
              icon={ArrowUpDown}
              value={activeSocial.y}
              min={10}
              max={90}
              step={1}
              defaultValue={82}
              unit="%"
              onChange={(v) => onUpdateSocial(activeSocial.id, {y: v})}
            />
            <PrecisionSlider
              label="Opacity"
              icon={Eye}
              value={activeSocial.opacity}
              min={10}
              max={100}
              step={1}
              defaultValue={100}
              unit="%"
              onChange={(v) => onUpdateSocial(activeSocial.id, {opacity: v})}
            />
            <PrecisionSlider
              label="Animation Speed"
              icon={Gauge}
              value={activeSocial.animSpeed}
              min={0.5}
              max={2}
              step={0.1}
              defaultValue={1}
              unit="x"
              onChange={(v) => onUpdateSocial(activeSocial.id, {animSpeed: v})}
            />
            <PrecisionSlider
              label="Start Time"
              icon={Clock}
              value={activeSocial.startTime}
              min={0}
              max={Math.max(0.5, Number((totalDuration - 0.5).toFixed(1)))}
              step={0.1}
              defaultValue={0}
              unit="s"
              onChange={(v) => onUpdateSocial(activeSocial.id, {startTime: v})}
            />
            <PrecisionSlider
              label="Duration"
              icon={Timer}
              value={activeSocial.duration}
              min={1}
              max={Math.max(2, Number(totalDuration.toFixed(1)))}
              step={0.1}
              defaultValue={4}
              unit="s"
              onChange={(v) => onUpdateSocial(activeSocial.id, {duration: v})}
            />
          </div>
        </div>
      )}
    </div>
  );
};
