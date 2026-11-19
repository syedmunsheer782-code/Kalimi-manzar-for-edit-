import React from 'react';
import {
  CheckCheck,
  Droplets,
  Feather,
  Layers,
  Pipette,
  RotateCcw,
  SlidersHorizontal,
  SunMedium,
} from 'lucide-react';
import {
  ChromaKeyConfig,
  DEFAULT_CHROMA_KEY,
  MediaClip,
  PipLayer,
} from '../../types/editor';
import {CHROMA_PRESET_COLORS} from '../../utils/chromaKey';
import {PrecisionSlider} from '../PrecisionSlider';

interface ChromaKeyPanelProps {
  activeClip: MediaClip | null;
  clipsCount: number;
  pipLayers: PipLayer[];
  activePipId: string | null;
  target: 'clip' | 'pip';
  onChangeTarget: (target: 'clip' | 'pip') => void;
  eyedropperActive: boolean;
  onToggleEyedropper: () => void;
  onUpdateClipChroma: (clipId: string, patch: Partial<ChromaKeyConfig>) => void;
  onUpdatePipChroma: (pipId: string, patch: Partial<ChromaKeyConfig>) => void;
  onApplyChromaToAllClips: (config: ChromaKeyConfig) => void;
}

/**
 * High-Precision Chroma Key Studio Panel.
 * Works on ANY plain background color (Canvas Eyedropper, presets, or custom color picker),
 * supports both Main Clips and PIP Overlays, stays at neutral 0 until adjusted,
 * and uses universal compact '- / [editable number] / +' stepper controls.
 */
export const ChromaKeyPanel: React.FC<ChromaKeyPanelProps> = ({
  activeClip,
  clipsCount,
  pipLayers,
  activePipId,
  target,
  onChangeTarget,
  eyedropperActive,
  onToggleEyedropper,
  onUpdateClipChroma,
  onUpdatePipChroma,
  onApplyChromaToAllClips,
}) => {
  const activePip = pipLayers.find((p) => p.id === activePipId) ?? pipLayers[0] ?? null;
  const effectiveTarget: 'clip' | 'pip' = target === 'pip' && activePip ? 'pip' : 'clip';

  const currentConfig: ChromaKeyConfig =
    effectiveTarget === 'pip' && activePip
      ? {...DEFAULT_CHROMA_KEY, ...(activePip.chromaKey ?? {})}
      : {...DEFAULT_CHROMA_KEY, ...(activeClip?.chromaKey ?? {})};

  const commitPatch = (patch: Partial<ChromaKeyConfig>) => {
    const merged: ChromaKeyConfig = {
      ...currentConfig,
      ...patch,
    };
    // Keep neutral-0-until-adjusted behavior: automatically arm when strength > 0,
    // and disarm cleanly if strength returns to 0 unless explicitly toggled
    if ('strength' in patch) {
      merged.enabled = (patch.strength ?? 0) > 0;
    }
    if (effectiveTarget === 'pip' && activePip) {
      onUpdatePipChroma(activePip.id, merged);
    } else if (activeClip) {
      onUpdateClipChroma(activeClip.id, merged);
    }
  };

  const handleReset = () => {
    if (effectiveTarget === 'pip' && activePip) {
      onUpdatePipChroma(activePip.id, {...DEFAULT_CHROMA_KEY});
    } else if (activeClip) {
      onUpdateClipChroma(activeClip.id, {...DEFAULT_CHROMA_KEY});
    }
  };

  const isActive = currentConfig.enabled && currentConfig.strength > 0;
  const isModified =
    currentConfig.strength > 0 ||
    currentConfig.feather > 0 ||
    currentConfig.spillSuppression > 0 ||
    currentConfig.shadowTolerance > 0;

  return (
    <div className="space-y-4">
      {/* Header + Reset & Apply to All */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">Chroma Key</h3>
          <p className="text-xs text-neutral-400">
            Remove any plain color · clean edges &amp; spill removal
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {effectiveTarget === 'clip' && clipsCount > 1 && isModified && (
            <button
              type="button"
              onClick={() => onApplyChromaToAllClips(currentConfig)}
              className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded-lg bg-[#161616] border border-white/20 text-[11px] font-semibold text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
              title="Apply Chroma Key to all timeline clips"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>All</span>
            </button>
          )}
          {isModified && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded-lg bg-[#151515] border border-white/12 text-xs text-neutral-300 hover:text-white cursor-pointer"
              title="Reset Chroma Key to neutral 0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Target Layer Selector (Main Video/Photo Clip vs PIP Overlay) */}
      {pipLayers.length > 0 && (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#121212] border border-white/10">
          <button
            type="button"
            onClick={() => onChangeTarget('clip')}
            className={`min-h-[34px] rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              effectiveTarget === 'clip'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Main Clip</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTarget('pip')}
            className={`min-h-[34px] rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              effectiveTarget === 'pip'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="truncate max-w-[95px]">
              PIP: {activePip?.name ?? 'Overlay'}
            </span>
          </button>
        </div>
      )}

      {/* Key Color Picker Card: Canvas Eyedropper + Custom Color + Selected Swatch */}
      <div className="p-3 rounded-xl bg-[#0e0e0e] border border-white/12 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-lg border-2 border-white/60 shrink-0 shadow-inner"
              style={{backgroundColor: currentConfig.keyColor}}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white">Key Background Color</div>
              <div className="text-[11px] font-mono-num text-neutral-400 uppercase">
                {currentConfig.keyColor} · {isActive ? 'Key Active' : 'Neutral 0%'}
              </div>
            </div>
          </div>

          <label
            className="min-h-[34px] px-2.5 rounded-lg bg-[#191919] border border-white/20 text-[11px] font-medium text-neutral-200 hover:border-white flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Choose any custom hex background color"
          >
            <span>Custom</span>
            <input
              type="color"
              value={currentConfig.keyColor}
              onChange={(e) => commitPatch({keyColor: e.target.value.toUpperCase()})}
              className="w-4 h-4 rounded border-0 bg-transparent p-0 cursor-pointer"
              aria-label="Pick custom Chroma Key color"
            />
          </label>
        </div>

        {/* Canvas Eyedropper Action */}
        <button
          type="button"
          onClick={onToggleEyedropper}
          className={`w-full min-h-[40px] rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            eyedropperActive
              ? 'bg-white text-black border-white'
              : 'bg-[#171717] text-white border-white/20 hover:border-white/55'
          }`}
        >
          <Pipette className="w-4 h-4" />
          <span>
            {eyedropperActive
              ? 'Tap Any Background Color on Canvas...'
              : 'Pick Color From Canvas (Eyedropper)'}
          </span>
        </button>

        {/* Plain Background Color Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-neutral-400">Plain Background Presets</span>
          <div className="grid grid-cols-5 gap-1.5">
            {CHROMA_PRESET_COLORS.map((preset) => {
              const selected =
                currentConfig.keyColor.toUpperCase() === preset.hex.toUpperCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => commitPatch({keyColor: preset.hex})}
                  className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    selected
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-[#131313] text-neutral-300 border-white/10 hover:border-white/40'
                  }`}
                  title={`${preset.label} (${preset.hex})`}
                >
                  <span
                    className="w-5 h-5 rounded-md border border-white/30 block"
                    style={{backgroundColor: preset.hex}}
                  />
                  <span className="text-[9px] leading-none truncate w-full text-center">
                    {preset.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Universal Compact '- / [editable keypad number] / +' Controls (Neutral 0 Default) */}
      <div className="space-y-3.5">
        <PrecisionSlider
          label="Color Tolerance (Strength)"
          icon={SlidersHorizontal}
          value={currentConfig.strength}
          min={0}
          max={100}
          step={1}
          defaultValue={0}
          unit="%"
          onChange={(v) => commitPatch({strength: v})}
        />
        <PrecisionSlider
          label="Edge Softening (Feather)"
          icon={Feather}
          value={currentConfig.feather}
          min={0}
          max={100}
          step={1}
          defaultValue={0}
          unit="%"
          onChange={(v) => commitPatch({feather: v})}
        />
        <PrecisionSlider
          label="Color-Spill Suppression"
          icon={Droplets}
          value={currentConfig.spillSuppression}
          min={0}
          max={100}
          step={1}
          defaultValue={0}
          unit="%"
          onChange={(v) => commitPatch({spillSuppression: v})}
        />
        <PrecisionSlider
          label="Shadow / Light Range"
          icon={SunMedium}
          value={currentConfig.shadowTolerance}
          min={0}
          max={100}
          step={1}
          defaultValue={0}
          unit="%"
          onChange={(v) => commitPatch({shadowTolerance: v})}
        />
      </div>

      {!isActive && (
        <p className="text-[11px] text-neutral-400 bg-[#111111] border border-white/10 rounded-lg px-2.5 py-2 leading-relaxed">
          Starts neutral at 0% with zero CPU load. Pick your plain background color above, then
          tap/hold <span className="text-white font-semibold">+</span> on Color Tolerance (e.g.
          25–45%) and dial Edge Softening &amp; Spill Suppression to remove halos cleanly.
        </p>
      )}
    </div>
  );
};
