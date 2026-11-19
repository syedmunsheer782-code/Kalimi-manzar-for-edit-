import React, {useState} from 'react';
import {
  Aperture,
  ArrowLeftRight,
  ArrowUpDown,
  Brush,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CloudFog,
  Columns2,
  Contrast,
  Crop,
  Diamond,
  Download,
  Droplet,
  Eraser,
  Eye,
  EyeOff,
  Feather,
  Gauge,
  Grip,
  Maximize2,
  Moon,
  MoveHorizontal,
  MoveVertical,
  Play,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  SunMedium,
  Thermometer,
  Timer,
  Trash2,
  Triangle,
  Undo2,
  Volume2,
  Wand2,
  ZoomIn,
} from 'lucide-react';
import {
  ENHANCE_MODES,
  FILTER_CATEGORIES,
  FILTER_PRESETS,
  FilterCategory,
  FilterPreset,
} from '../data/filters';
import {FontItem} from '../data/fonts';
import {
  TRANSITION_CATEGORIES,
  TRANSITION_PRESETS,
  TransitionCategory,
} from '../data/transitions';
import {
  AdjustmentValues,
  AspectRatioId,
  AudioNRConfig,
  ChromaKeyConfig,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_CROP,
  DEFAULT_MASK,
  EasingId,
  EditorToolTab,
  EnhanceModeId,
  KeyframeValues,
  MaskConfig,
  MaskShapeId,
  MediaClip,
  PipLayer,
  ResolutionId,
  SocialAnimationLayer,
  SocialPlatformId,
  SpotStroke,
  TextLayer,
} from '../types/editor';
import {evaluateKeyframes} from '../utils/canvasEngine';
import {AudioLibraryItem} from '../utils/offlineLibrary';
import {AudioNRPanel} from './panels/AudioNRPanel';
import {ChromaKeyPanel} from './panels/ChromaKeyPanel';
import {PipStudioPanel} from './panels/PipStudioPanel';
import {SocialStudioPanel} from './panels/SocialStudioPanel';
import {TextStudioPanel} from './panels/TextStudioPanel';
import {MaskShapeIcon} from './MaskShapeIcon';
import {PrecisionSlider} from './PrecisionSlider';
import {TransitionPreviewTile} from './TransitionPreviewTile';

interface ToolInspectorProps {
  activeTool: EditorToolTab;
  clips: MediaClip[];
  activeClip: MediaClip | null;
  filterPreviewThumb: string;
  activeClipLocalTime: number;
  activeClipStartTime: number;
  hasNextClip: boolean;
  aspectRatio: AspectRatioId;
  resolution: ResolutionId;
  fps: 30 | 60;
  compareMode: boolean;
  textLayers: TextLayer[];
  activeTextId: string | null;
  pipLayers: PipLayer[];
  activePipId: string | null;
  socialLayers: SocialAnimationLayer[];
  activeSocialId: string | null;
  totalDuration: number;
  customFonts: FontItem[];
  audioNR: AudioNRConfig;
  audioLibrary: AudioLibraryItem[];
  // Spot tool state
  spotBrushMode: 'heal' | 'erase';
  spotBrushSize: number;
  spotBrushFeather: number;
  pendingSpotStrokes: SpotStroke[];
  showSpotOverlay: boolean;
  onChangeSpotBrushMode: (mode: 'heal' | 'erase') => void;
  onChangeSpotBrushSize: (size: number) => void;
  onChangeSpotBrushFeather: (feather: number) => void;
  onToggleSpotOverlay: () => void;
  onUndoSpotStroke: () => void;
  onClearPendingSpots: () => void;
  onApplySpotRemoval: () => void;
  onResetSpotImage: () => void;
  onExportSpotPng: () => void;
  // Project / Clip handlers
  onChangeAspectRatio: (ar: AspectRatioId) => void;
  onChangeResolution: (res: ResolutionId) => void;
  onChangeFps: (fps: 30 | 60) => void;
  onToggleCompare: () => void;
  onUpdateClip: (clipId: string, patch: Partial<MediaClip>) => void;
  onUpdateAdjustments: (clipId: string, patch: Partial<AdjustmentValues>) => void;
  onUpdateMask: (clipId: string, patch: Partial<MaskConfig>) => void;
  onPreviewTransition: (clipId: string) => void;
  // Keyframes
  onAddOrUpdateKeyframe: (clipId: string, values: KeyframeValues, easing: EasingId) => void;
  onDeleteKeyframeAtPlayhead: (clipId: string) => void;
  onSeekGlobal: (time: number) => void;
  // Text & Custom Fonts
  onSelectText: (id: string) => void;
  onAddText: () => void;
  onDeleteText: (id: string) => void;
  onUpdateText: (id: string, patch: Partial<TextLayer>) => void;
  onImportCustomFonts: (files: FileList) => Promise<void>;
  onDeleteCustomFont: (fontId: string) => Promise<void>;
  // PIP Overlay
  onSelectPip: (id: string) => void;
  onAddPipFiles: (files: FileList) => Promise<void>;
  onAddPipFromClip: (clip: MediaClip) => void;
  onUpdatePip: (id: string, patch: Partial<PipLayer>) => void;
  onDeletePip: (id: string) => void;
  // Vector Social Animations
  onSelectSocial: (id: string) => void;
  onAddSocialPreset: (platform: SocialPlatformId) => void;
  onUpdateSocial: (id: string, patch: Partial<SocialAnimationLayer>) => void;
  onDeleteSocial: (id: string) => void;
  // Chroma Key
  chromaTarget: 'clip' | 'pip';
  onChangeChromaTarget: (target: 'clip' | 'pip') => void;
  chromaEyedropperActive: boolean;
  onToggleChromaEyedropper: () => void;
  onUpdateClipChroma: (clipId: string, patch: Partial<ChromaKeyConfig>) => void;
  onUpdatePipChroma: (pipId: string, patch: Partial<ChromaKeyConfig>) => void;
  onApplyChromaToAllClips: (config: ChromaKeyConfig) => void;
  // Apply to All ('✓✓') batch clip handlers
  onApplyAdjustmentsToAllClips: (adjustments: AdjustmentValues) => void;
  onApplyFilterToAllClips: (
    filterId: string,
    intensity: number,
    brightness: number,
    sizeFilter?: number,
  ) => void;
  onApplyEnhanceToAllClips: (
    enhanceMode: EnhanceModeId,
    strength: number,
    clarity4k: number,
  ) => void;
  // Audio & Library
  onUpdateAudioNR: (patch: Partial<AudioNRConfig>) => void;
  onSaveAudioToLibrary: (
    item: Omit<AudioLibraryItem, 'id' | 'createdAt' | 'objectUrl'>,
  ) => Promise<AudioLibraryItem>;
  onRenameAudioInLibrary: (id: string, nextName: string) => Promise<void>;
  onDeleteAudioFromLibrary: (id: string) => Promise<void>;
}

const ASPECT_RATIOS: AspectRatioId[] = ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'];
const RESOLUTIONS: {id: ResolutionId; label: string}[] = [
  {id: '4k', label: '4K'},
  {id: '2k', label: '2K'},
  {id: '1080p', label: '1080p'},
  {id: '720p', label: '720p'},
  {id: '480p', label: '480p'},
  {id: '360p', label: '360p'},
  {id: '240p', label: '240p'},
  {id: '144p', label: '144p'},
];

const MASK_SHAPES: {id: MaskShapeId; label: string}[] = [
  {id: 'none', label: 'None'},
  {id: 'brush', label: 'Brush'},
  {id: 'circle', label: 'Circle'},
  {id: 'rectangle', label: 'Rectangle'},
  {id: 'split', label: 'Split'},
  {id: 'filmstrip', label: 'Filmstrip'},
  {id: 'mirror', label: 'Mirror'},
  {id: 'diamond', label: 'Diamond'},
  {id: 'heart', label: 'Heart'},
  {id: 'star', label: 'Star'},
];

const GUIDED_AUTO_MASKS: {
  id: string;
  label: string;
  summary: string;
  config: Partial<MaskConfig>;
}[] = [
  {
    id: 'auto-portrait',
    label: 'Auto Subject',
    summary: 'Soft center portrait oval',
    config: {shape: 'circle', x: 50, y: 48, width: 58, height: 76, rotation: 0, feather: 18, invert: false},
  },
  {
    id: 'auto-split',
    label: 'Auto Split',
    summary: 'Blended horizontal horizon',
    config: {shape: 'split', x: 50, y: 50, width: 100, height: 100, rotation: 0, feather: 16, invert: false},
  },
  {
    id: 'auto-cinema',
    label: 'Auto Cinema',
    summary: 'Widescreen letterbox frame',
    config: {shape: 'filmstrip', x: 50, y: 50, width: 100, height: 72, rotation: 0, feather: 0, invert: false},
  },
  {
    id: 'auto-vignette',
    label: 'Auto Spotlight',
    summary: 'Soft inverted cutout frame',
    config: {shape: 'circle', x: 50, y: 50, width: 78, height: 78, rotation: 0, feather: 32, invert: true},
  },
];

const EASING_OPTIONS: {id: EasingId; label: string}[] = [
  {id: 'linear', label: 'Linear'},
  {id: 'ease-in', label: 'Ease In'},
  {id: 'ease-out', label: 'Ease Out'},
  {id: 'ease-in-out', label: 'Smooth'},
  {id: 'spring', label: 'Spring'},
];

export const ToolInspector: React.FC<ToolInspectorProps> = (props) => {
  const {activeTool, activeClip, activeClipLocalTime, activeClipStartTime} = props;
  const [filterCat, setFilterCat] = useState<FilterCategory>('All');
  const [enhanceFilter, setEnhanceFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [transCat, setTransCat] = useState<TransitionCategory>('All');
  const [kfEasing, setKfEasing] = useState<EasingId>('ease-in-out');

  if (activeTool === 'chroma') {
    return (
      <ChromaKeyPanel
        activeClip={activeClip}
        clipsCount={props.clips.length}
        pipLayers={props.pipLayers}
        activePipId={props.activePipId}
        target={props.chromaTarget}
        onChangeTarget={props.onChangeChromaTarget}
        eyedropperActive={props.chromaEyedropperActive}
        onToggleEyedropper={props.onToggleChromaEyedropper}
        onUpdateClipChroma={props.onUpdateClipChroma}
        onUpdatePipChroma={props.onUpdatePipChroma}
        onApplyChromaToAllClips={props.onApplyChromaToAllClips}
      />
    );
  }

  if (activeTool === 'pip') {
    return (
      <PipStudioPanel
        pipLayers={props.pipLayers}
        activePipId={props.activePipId}
        clips={props.clips}
        totalDuration={props.totalDuration}
        onSelectPip={props.onSelectPip}
        onAddPipFiles={props.onAddPipFiles}
        onAddPipFromClip={props.onAddPipFromClip}
        onUpdatePip={props.onUpdatePip}
        onDeletePip={props.onDeletePip}
      />
    );
  }

  if (activeTool === 'social') {
    return (
      <SocialStudioPanel
        socialLayers={props.socialLayers}
        activeSocialId={props.activeSocialId}
        totalDuration={props.totalDuration}
        onSelectSocial={props.onSelectSocial}
        onAddSocialPreset={props.onAddSocialPreset}
        onUpdateSocial={props.onUpdateSocial}
        onDeleteSocial={props.onDeleteSocial}
      />
    );
  }

  if (activeTool === 'text') {
    return (
      <TextStudioPanel
        textLayers={props.textLayers}
        activeTextId={props.activeTextId}
        customFonts={props.customFonts}
        onImportCustomFonts={props.onImportCustomFonts}
        onDeleteCustomFont={props.onDeleteCustomFont}
        onSelectText={props.onSelectText}
        onAddText={props.onAddText}
        onDeleteText={props.onDeleteText}
        onUpdateText={props.onUpdateText}
      />
    );
  }

  if (activeTool === 'audio') {
    return (
      <AudioNRPanel
        audioNR={props.audioNR}
        activeClip={activeClip}
        clips={props.clips}
        audioLibrary={props.audioLibrary}
        onUpdateClip={props.onUpdateClip}
        onUpdateAudioNR={props.onUpdateAudioNR}
        onSaveAudioToLibrary={props.onSaveAudioToLibrary}
        onRenameAudioInLibrary={props.onRenameAudioInLibrary}
        onDeleteAudioFromLibrary={props.onDeleteAudioFromLibrary}
      />
    );
  }

  if (!activeClip) {
    return (
      <div className="p-6 text-center text-xs text-neutral-400">
        Import a photo or video clip to begin editing.
      </div>
    );
  }

  // 1. ENHANCE & 4K CLARITY
  if (activeTool === 'enhance') {
    const visibleModes = ENHANCE_MODES.filter(
      (m) => enhanceFilter === 'all' || m.target === 'both' || m.target === enhanceFilter,
    );
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">4K Clarity &amp; Enhance</h3>
            <p className="text-xs text-neutral-400">Crisp non-pixelated upscaling &amp; detail modes</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {props.clips.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  props.onApplyEnhanceToAllClips(
                    activeClip.enhanceMode,
                    activeClip.enhanceStrength,
                    activeClip.adjustments.clarity4k,
                  )
                }
                className="inline-flex items-center gap-1 min-h-[34px] px-2 rounded-lg bg-[#161616] border border-white/20 text-[11px] font-semibold text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                title="Apply Enhance & 4K Clarity to all timeline clips"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>All</span>
              </button>
            )}
            <button
              type="button"
              onClick={props.onToggleCompare}
              className={`inline-flex items-center gap-1 min-h-[34px] px-2.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                props.compareMode
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-[#141414] text-neutral-300 border-white/15 hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </div>
        </div>

        {/* Resolution & Frame Rate */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-neutral-400">Canvas Clarity Resolution</span>
          <div className="grid grid-cols-4 gap-1.5">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => props.onChangeResolution(r.id)}
                className={`min-h-[36px] rounded-lg text-xs font-mono-num border transition-colors cursor-pointer ${
                  props.resolution === r.id
                    ? 'bg-white text-black border-white font-bold'
                    : 'bg-[#121212] text-neutral-300 border-white/12 hover:border-white/35'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio & FPS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Aspect Ratio</span>
            <div className="flex items-center gap-1">
              {([30, 60] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => props.onChangeFps(f)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono-num cursor-pointer ${
                    props.fps === f
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#151515] text-neutral-400 hover:text-white'
                  }`}
                >
                  {f}fps
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar}
                type="button"
                onClick={() => props.onChangeAspectRatio(ar)}
                className={`min-h-[34px] rounded-lg text-[11px] font-mono-num border transition-colors cursor-pointer ${
                  props.aspectRatio === ar
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#121212] text-neutral-300 border-white/10 hover:border-white/30'
                }`}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>

        <PrecisionSlider
          label="4K Clarity Detail"
          icon={Sparkles}
          value={activeClip.adjustments.clarity4k}
          min={0}
          max={100}
          step={1}
          defaultValue={0}
          unit="%"
          onChange={(v) => props.onUpdateAdjustments(activeClip.id, {clarity4k: v})}
        />

        <PrecisionSlider
          label="Enhance Strength"
          icon={Wand2}
          value={activeClip.enhanceStrength}
          min={0}
          max={100}
          step={1}
          defaultValue={0}
          unit="%"
          onChange={(v) => props.onUpdateClip(activeClip.id, {enhanceStrength: v})}
        />
        {activeClip.enhanceMode !== 'none' && activeClip.enhanceStrength === 0 && (
          <p className="text-[11px] text-neutral-400 bg-[#121212] border border-white/10 rounded-lg px-2.5 py-1.5">
            Mode ready at neutral 0% · tap/hold + or enter a number above to apply.
          </p>
        )}

        <PrecisionSlider
          label="Clip Size (Auto-Fit)"
          icon={ZoomIn}
          value={Math.round(activeClip.scale && activeClip.scale > 0 ? activeClip.scale : 100)}
          min={10}
          max={300}
          step={1}
          defaultValue={100}
          unit="%"
          onChange={(v) => props.onUpdateClip(activeClip.id, {scale: v})}
        />

        <PrecisionSlider
          label="Playback Speed"
          icon={Gauge}
          value={activeClip.speed}
          min={0.25}
          max={4}
          step={0.1}
          defaultValue={1}
          unit="x"
          onChange={(v) => props.onUpdateClip(activeClip.id, {speed: v})}
        />

        <PrecisionSlider
          label="Clip Volume"
          icon={Volume2}
          value={activeClip.muted ? 0 : activeClip.volume}
          min={0}
          max={100}
          step={1}
          defaultValue={100}
          unit="%"
          onChange={(v) => props.onUpdateClip(activeClip.id, {volume: v, muted: v === 0})}
        />

        {/* Clean Non-Destructive Aspect-Preserving Crop Controls */}
        {(() => {
          const crop = activeClip.crop ?? DEFAULT_CROP;
          const isCropped =
            crop.top > 0 || crop.bottom > 0 || crop.left > 0 || crop.right > 0;
          const updateCrop = (patch: Partial<typeof DEFAULT_CROP>) =>
            props.onUpdateClip(activeClip.id, {crop: {...crop, ...patch}});
          return (
            <div className="p-3 rounded-xl bg-[#0e0e0e] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-300">
                  <Crop className="w-3.5 h-3.5" />
                  <span>Crop Frame</span>
                </span>
                {isCropped && (
                  <button
                    type="button"
                    onClick={() => props.onUpdateClip(activeClip.id, {crop: {...DEFAULT_CROP}})}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <PrecisionSlider
                  label="Crop Top"
                  icon={Crop}
                  value={crop.top}
                  min={0}
                  max={45}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  onChange={(v) => updateCrop({top: v})}
                />
                <PrecisionSlider
                  label="Crop Bottom"
                  icon={Crop}
                  value={crop.bottom}
                  min={0}
                  max={45}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  onChange={(v) => updateCrop({bottom: v})}
                />
                <PrecisionSlider
                  label="Crop Left"
                  icon={Crop}
                  value={crop.left}
                  min={0}
                  max={45}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  onChange={(v) => updateCrop({left: v})}
                />
                <PrecisionSlider
                  label="Crop Right"
                  icon={Crop}
                  value={crop.right}
                  min={0}
                  max={45}
                  step={1}
                  defaultValue={0}
                  unit="%"
                  onChange={(v) => updateCrop({right: v})}
                />
              </div>
            </div>
          );
        })()}

        {/* Photo / Video Enhance Mode Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">Enhance Modes</span>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#141414] border border-white/10">
              {(['all', 'photo', 'video'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setEnhanceFilter(k)}
                  className={`px-2 py-1 rounded text-[11px] capitalize cursor-pointer ${
                    enhanceFilter === k
                      ? 'bg-white text-black font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            {visibleModes.map((mode) => {
              const selected = activeClip.enhanceMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => props.onUpdateClip(activeClip.id, {enhanceMode: mode.id})}
                  className={`w-full px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-white text-black border-white'
                      : 'bg-[#101010] text-white border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{mode.name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider ${
                        selected ? 'text-neutral-700' : 'text-neutral-500'
                      }`}
                    >
                      {mode.target}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 ${
                      selected ? 'text-neutral-700' : 'text-neutral-400'
                    }`}
                  >
                    {mode.summary}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 2. FILTERS
  if (activeTool === 'filters') {
    const visibleFilters =
      filterCat === 'All'
        ? FILTER_PRESETS
        : FILTER_PRESETS.filter((f) => f.category === filterCat);

    const activePreset =
      FILTER_PRESETS.find((f) => f.id === activeClip.filterId) ?? FILTER_PRESETS[0];
    const filterBrightnessVal = activeClip.filterBrightness ?? 0;
    const isFilterTuned =
      activeClip.filterIntensity !== 0 || Math.abs(filterBrightnessVal) > 0.01;

    const updateActiveFilterTuning = (nextIntensity: number, nextBrightness: number) => {
      props.onUpdateClip(activeClip.id, {
        filterIntensity: nextIntensity,
        filterBrightness: nextBrightness,
        filterSettings: {
          ...(activeClip.filterSettings ?? {}),
          [activeClip.filterId]: {intensity: nextIntensity, brightness: nextBrightness},
        },
      });
    };

    const handleSelectFilter = (f: FilterPreset) => {
      const saved = activeClip.filterSettings?.[f.id];
      const nextIntensity = f.id === 'original' ? 0 : saved ? saved.intensity : 0;
      const nextBrightness = f.id === 'original' ? 0 : saved ? saved.brightness : 0;
      props.onUpdateClip(activeClip.id, {
        filterId: f.id,
        filterIntensity: nextIntensity,
        filterBrightness: nextBrightness,
      });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Studio Filters</h3>
            <p className="text-xs text-neutral-400">
              Active: {activePreset.name} · starts neutral at 0% until dialed
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {props.clips.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  props.onApplyFilterToAllClips(
                    activeClip.filterId,
                    activeClip.filterIntensity,
                    filterBrightnessVal,
                    activeClip.adjustments.sizeFilter ?? 0,
                  )
                }
                className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded-lg bg-[#161616] border border-white/20 text-[11px] font-semibold text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                title="Apply current filter & tuning to all timeline clips"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>All</span>
              </button>
            )}
            {(isFilterTuned || Math.abs(activeClip.adjustments.sizeFilter ?? 0) > 0.01) && (
              <button
                type="button"
                onClick={() => {
                  updateActiveFilterTuning(0, 0);
                  props.onUpdateAdjustments(activeClip.id, {sizeFilter: 0});
                }}
                className="inline-flex items-center gap-1 min-h-[32px] px-2.5 rounded-lg bg-[#151515] border border-white/12 text-xs text-neutral-300 hover:text-white cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0e0e0e] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="font-medium text-neutral-200 truncate">
              {activePreset.name} Controls
            </span>
            <span className="font-mono-num text-neutral-500">
              {activePreset.category}
            </span>
          </div>
          <PrecisionSlider
            label="Filter Intensity"
            icon={SlidersHorizontal}
            value={activeClip.filterIntensity}
            min={0}
            max={100}
            step={1}
            defaultValue={0}
            unit="%"
            onChange={(v) => updateActiveFilterTuning(v, filterBrightnessVal)}
          />
          <PrecisionSlider
            label="Filter Brightness"
            icon={Sun}
            value={filterBrightnessVal}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            showSign
            onChange={(v) => updateActiveFilterTuning(activeClip.filterIntensity, v)}
          />
          <PrecisionSlider
            label="Size Filter"
            icon={Maximize2}
            value={activeClip.adjustments.sizeFilter ?? 0}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            unit="%"
            showSign
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {sizeFilter: v})}
          />
          {activeClip.filterId !== 'original' && activeClip.filterIntensity === 0 && (
            <p className="text-[11px] text-neutral-400">
              Filter selected at 0% · slide, tap/hold +, or type a number to ramp up.
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto studio-scroll pb-1">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                filterCat === cat
                  ? 'bg-white text-black font-semibold'
                  : 'bg-[#141414] text-neutral-400 hover:text-white'
              }`}
            >
              {cat === 'Clarity' ? 'Clarity (8)' : cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {visibleFilters.map((f: FilterPreset) => {
            const selected = activeClip.filterId === f.id;
            const saved = activeClip.filterSettings?.[f.id];
            const previewInt =
              selected && activeClip.filterIntensity > 0
                ? activeClip.filterIntensity / 100
                : saved && saved.intensity > 0
                  ? saved.intensity / 100
                  : 1;
            const previewBright = selected
              ? filterBrightnessVal / 100
              : saved
                ? saved.brightness / 100
                : 0;
            const clarityPreviewContrast = (f.clarityBoost ?? 0) * 0.14;
            const filterCss = [
              `brightness(${Math.max(0.2, 1 + f.brightness * previewInt + previewBright).toFixed(2)})`,
              `contrast(${Math.max(0.2, 1 + (f.contrast + clarityPreviewContrast) * previewInt).toFixed(2)})`,
              `saturate(${Math.max(0, 1 + (f.saturate - 1) * previewInt).toFixed(2)})`,
              f.grayscale * previewInt > 0.01 ? `grayscale(${(f.grayscale * previewInt).toFixed(2)})` : '',
              f.sepia * previewInt > 0.01 ? `sepia(${(f.sepia * previewInt).toFixed(2)})` : '',
              f.hueRotate !== 0 ? `hue-rotate(${(f.hueRotate * previewInt).toFixed(1)}deg)` : '',
            ]
              .filter(Boolean)
              .join(' ');
            const hasCustomTune =
              Boolean(saved) && (saved!.intensity > 0 || saved!.brightness !== 0);

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelectFilter(f)}
                className={`rounded-xl overflow-hidden border transition-all text-left cursor-pointer group ${
                  selected
                    ? 'border-white ring-1 ring-white'
                    : 'border-white/12 hover:border-white/40'
                }`}
              >
                <div className="relative h-16 w-full overflow-hidden bg-black">
                  {props.filterPreviewThumb ? (
                    <img
                      src={props.filterPreviewThumb}
                      alt={`${f.name} filter preview`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      style={{filter: filterCss}}
                    />
                  ) : (
                    <div className="w-full h-full" style={{background: f.swatchCss}} />
                  )}
                  {f.tintColor && previewInt > 0.05 && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: f.tintColor,
                        opacity: previewInt,
                        mixBlendMode: (f.tintBlend as React.CSSProperties['mixBlendMode']) ?? 'soft-light',
                      }}
                    />
                  )}
                  {f.vignetteAdd && f.vignetteAdd > 0.05 && previewInt > 0.05 && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, transparent 42%, rgba(0,0,0,${Math.min(0.8, f.vignetteAdd * previewInt * 1.4).toFixed(2)}) 100%)`,
                      }}
                    />
                  )}
                </div>
                <div className={`px-2 py-1.5 ${selected ? 'bg-white text-black' : 'bg-[#0f0f0f] text-white'}`}>
                  <div className="text-[11px] font-semibold truncate">{f.name}</div>
                  <div
                    className={`text-[10px] font-mono-num truncate ${
                      selected ? 'text-neutral-700' : 'text-neutral-500'
                    }`}
                  >
                    {hasCustomTune
                      ? `${saved!.intensity}% · ${saved!.brightness > 0 ? `+${saved!.brightness}` : saved!.brightness}`
                      : f.category}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. ADJUST (BRIGHTNESS, CONTRAST + PRECISION +/- SLIDERS)
  if (activeTool === 'adjust') {
    const adj = activeClip.adjustments;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Brightness &amp; Tone</h3>
            <p className="text-xs text-neutral-400">Neutral 0 default · tap/hold - / + or type number</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {props.clips.length > 1 && (
              <button
                type="button"
                onClick={() => props.onApplyAdjustmentsToAllClips(adj)}
                className="inline-flex items-center gap-1 min-h-[34px] px-2 rounded-lg bg-[#161616] border border-white/20 text-[11px] font-semibold text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
                title="Apply all tone & brightness adjustments to every timeline clip"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>All</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => props.onUpdateAdjustments(activeClip.id, {...DEFAULT_ADJUSTMENTS})}
              className="inline-flex items-center gap-1 min-h-[34px] px-2.5 rounded-lg bg-[#151515] border border-white/12 text-xs text-neutral-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <PrecisionSlider
            label="Size Filter"
            icon={Maximize2}
            value={adj.sizeFilter ?? 0}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            unit="%"
            showSign
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {sizeFilter: v})}
          />
          <PrecisionSlider
            label="Brightness"
            icon={Sun}
            value={adj.brightness}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            showSign
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {brightness: v})}
          />
          <PrecisionSlider
            label="Contrast"
            icon={Contrast}
            value={adj.contrast}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            showSign
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {contrast: v})}
          />
          <PrecisionSlider
            label="Exposure"
            icon={Aperture}
            value={adj.exposure}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            showSign
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {exposure: v})}
          />
          <PrecisionSlider
            label="Highlights"
            icon={SunMedium}
            value={adj.highlights}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            showSign
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {highlights: v})}
          />
          <PrecisionSlider
            label="Shadows"
            icon={Moon}
            value={adj.shadows}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            showSign
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {shadows: v})}
          />
          <PrecisionSlider
            label="Saturation"
            icon={Droplet}
            value={adj.saturation}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            showSign
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {saturation: v})}
          />
          <PrecisionSlider
            label="Warmth"
            icon={Thermometer}
            value={adj.warmth}
            min={-100}
            max={100}
            step={1}
            defaultValue={0}
            showSign
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {warmth: v})}
          />
          <PrecisionSlider
            label="Sharpness"
            icon={Triangle}
            value={adj.sharpness}
            min={0}
            max={100}
            step={1}
            defaultValue={0}
            unit="%"
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {sharpness: v})}
          />
          <PrecisionSlider
            label="4K Clarity"
            icon={Sparkles}
            value={adj.clarity4k}
            min={0}
            max={100}
            step={1}
            defaultValue={0}
            unit="%"
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {clarity4k: v})}
          />
          <PrecisionSlider
            label="Vignette"
            icon={CircleDot}
            value={adj.vignette}
            min={0}
            max={100}
            step={1}
            defaultValue={0}
            unit="%"
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {vignette: v})}
          />
          <PrecisionSlider
            label="Matte Fade"
            icon={CloudFog}
            value={adj.fade}
            min={0}
            max={100}
            step={1}
            defaultValue={0}
            unit="%"
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {fade: v})}
          />
          <PrecisionSlider
            label="Film Grain"
            icon={Grip}
            value={adj.grain}
            min={0}
            max={100}
            step={1}
            defaultValue={0}
            unit="%"
            onChange={(v) => props.onUpdateAdjustments(activeClip.id, {grain: v})}
          />
        </div>
      </div>
    );
  }

  // 4. CAPCUT-STYLE TRANSITIONS
  if (activeTool === 'transitions') {
    const visibleTrans =
      transCat === 'All'
        ? TRANSITION_PRESETS
        : TRANSITION_PRESETS.filter((t) => t.category === transCat);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Clip Transitions</h3>
            <p className="text-xs text-neutral-400">Smooth CapCut-style motion transitions</p>
          </div>
          {props.hasNextClip && (
            <button
              type="button"
              onClick={() => props.onPreviewTransition(activeClip.id)}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Preview</span>
            </button>
          )}
        </div>

        {!props.hasNextClip ? (
          <div className="p-4 rounded-xl bg-[#111111] border border-white/10 text-xs text-neutral-400 leading-relaxed">
            Select any clip that has another clip after it (or add a second clip in the timeline) to
            apply a smooth transition between clips.
          </div>
        ) : (
          <>
            <PrecisionSlider
              label="Transition Duration"
              icon={Timer}
              value={activeClip.transitionDuration}
              min={0.2}
              max={2.4}
              step={0.1}
              defaultValue={0.7}
              unit="s"
              onChange={(v) => props.onUpdateClip(activeClip.id, {transitionDuration: v})}
            />

            <div className="flex items-center gap-1 overflow-x-auto studio-scroll pb-1">
              {TRANSITION_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTransCat(cat)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    transCat === cat
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#141414] text-neutral-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {visibleTrans.map((tr) => {
                const selected = activeClip.transitionOut === tr.id;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() =>
                      props.onUpdateClip(activeClip.id, {
                        transitionOut: tr.id,
                        transitionDuration:
                          tr.id === 'none'
                            ? 0
                            : activeClip.transitionDuration > 0
                              ? activeClip.transitionDuration
                              : tr.defaultDuration,
                      })
                    }
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                      selected
                        ? 'bg-white text-black border-white'
                        : 'bg-[#101010] text-white border-white/10 hover:border-white/35'
                    }`}
                  >
                    <TransitionPreviewTile transitionId={tr.id} active={selected} />
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold truncate">{tr.name}</span>
                        <Sparkles
                          className={`w-3 h-3 shrink-0 ${selected ? 'text-black' : 'text-neutral-500'}`}
                        />
                      </div>
                      <p
                        className={`text-[10px] mt-0.5 line-clamp-1 ${
                          selected ? 'text-neutral-700' : 'text-neutral-400'
                        }`}
                      >
                        {tr.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // 5. MASKING (VISUAL SHAPE PREVIEW ICONS + GUIDED/AUTO CUSTOM MASK + FEATHER & INVERT)
  if (activeTool === 'mask') {
    const mask = activeClip.mask;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Masking Studio</h3>
            <p className="text-xs text-neutral-400">
              Visual shapes, guided custom masks, feather &amp; invert
            </p>
          </div>
          {mask.shape !== 'none' && (
            <button
              type="button"
              onClick={() => props.onUpdateMask(activeClip.id, {...DEFAULT_MASK})}
              className="inline-flex items-center gap-1 min-h-[34px] px-2.5 rounded-lg bg-[#151515] border border-white/12 text-xs text-neutral-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Visual Preview Icons for Every Mask Shape */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-neutral-400">Mask Shapes</span>
          <div className="grid grid-cols-3 gap-1.5">
            {MASK_SHAPES.map((s) => {
              const selected = mask.shape === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => props.onUpdateMask(activeClip.id, {shape: s.id})}
                  className={`min-h-[62px] py-2 px-1.5 rounded-xl text-[11px] font-medium border transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    selected
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-[#111111] text-neutral-300 border-white/10 hover:border-white/35'
                  }`}
                >
                  <MaskShapeIcon
                    shape={s.id}
                    active={selected}
                    inverted={selected && mask.invert}
                  />
                  <span className="leading-none">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Guided / Automatic Custom Mask Creation */}
        <div className="space-y-1.5 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400">
              Guided / Auto Custom Mask
            </span>
            <span className="text-[10px] text-neutral-500">1-tap fit + drag on canvas</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {GUIDED_AUTO_MASKS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => props.onUpdateMask(activeClip.id, preset.config)}
                className="p-2 rounded-xl bg-[#111111] border border-white/12 hover:border-white/45 text-left transition-colors cursor-pointer flex items-center gap-2"
              >
                <MaskShapeIcon
                  shape={preset.config.shape ?? 'circle'}
                  inverted={Boolean(preset.config.invert)}
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white truncate">
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate">
                    {preset.summary}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {mask.shape !== 'none' && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-300">Invert Mask Area</span>
              <button
                type="button"
                onClick={() => props.onUpdateMask(activeClip.id, {invert: !mask.invert})}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  mask.invert
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#141414] text-neutral-300 border-white/15 hover:border-white/40'
                }`}
              >
                {mask.invert ? 'Inverted' : 'Normal'}
              </button>
            </div>

            <PrecisionSlider
              label="Edge Feather"
              icon={Feather}
              value={mask.feather}
              min={0}
              max={100}
              step={1}
              defaultValue={0}
              unit="%"
              onChange={(v) => props.onUpdateMask(activeClip.id, {feather: v})}
            />

            {mask.shape === 'brush' ? (
              <div className="space-y-3">
                <PrecisionSlider
                  label="Mask Brush Size"
                  icon={Brush}
                  value={mask.brushSize ?? 28}
                  min={5}
                  max={100}
                  step={1}
                  defaultValue={28}
                  unit="%"
                  onChange={(v) => props.onUpdateMask(activeClip.id, {brushSize: v})}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={(mask.brushStrokes?.length ?? 0) === 0}
                    onClick={() =>
                      props.onUpdateMask(activeClip.id, {
                        brushStrokes: (mask.brushStrokes ?? []).slice(0, -1),
                      })
                    }
                    className="min-h-[36px] rounded-lg bg-[#151515] border border-white/12 text-xs text-neutral-200 hover:text-white disabled:opacity-35 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Undo Stroke</span>
                  </button>
                  <button
                    type="button"
                    disabled={(mask.brushStrokes?.length ?? 0) === 0}
                    onClick={() => props.onUpdateMask(activeClip.id, {brushStrokes: []})}
                    className="min-h-[36px] rounded-lg bg-[#151515] border border-white/12 text-xs text-neutral-200 hover:text-white disabled:opacity-35 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Brush</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Paint directly on the preview canvas to create a custom hand-drawn mask (
                  {mask.brushStrokes?.length ?? 0} strokes). Toggle Invert above to erase instead of
                  keep.
                </p>
              </div>
            ) : (
              <>
                <PrecisionSlider
                  label="Center X"
                  icon={ArrowLeftRight}
                  value={mask.x}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={50}
                  unit="%"
                  onChange={(v) => props.onUpdateMask(activeClip.id, {x: v})}
                />
                <PrecisionSlider
                  label="Center Y"
                  icon={ArrowUpDown}
                  value={mask.y}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={50}
                  unit="%"
                  onChange={(v) => props.onUpdateMask(activeClip.id, {y: v})}
                />
                <PrecisionSlider
                  label="Mask Width"
                  icon={MoveHorizontal}
                  value={mask.width}
                  min={5}
                  max={140}
                  step={1}
                  defaultValue={65}
                  unit="%"
                  onChange={(v) => props.onUpdateMask(activeClip.id, {width: v})}
                />
                <PrecisionSlider
                  label="Mask Height"
                  icon={MoveVertical}
                  value={mask.height}
                  min={5}
                  max={140}
                  step={1}
                  defaultValue={65}
                  unit="%"
                  onChange={(v) => props.onUpdateMask(activeClip.id, {height: v})}
                />
                <PrecisionSlider
                  label="Rotation"
                  icon={RotateCw}
                  value={mask.rotation}
                  min={-180}
                  max={180}
                  step={1}
                  defaultValue={0}
                  unit="°"
                  showSign
                  onChange={(v) => props.onUpdateMask(activeClip.id, {rotation: v})}
                />
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // 6. MARK-AND-REMOVE SPOT TOOL WITH PNG EXPORT
  if (activeTool === 'spot') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Mark &amp; Remove Spot Tool</h3>
          <p className="text-xs text-neutral-400">
            Paint marks on canvas to heal spots or erase to transparent PNG
          </p>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#121212] border border-white/10">
          <button
            type="button"
            onClick={() => props.onChangeSpotBrushMode('heal')}
            className={`min-h-[38px] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              props.spotBrushMode === 'heal'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Heal Spot</span>
          </button>
          <button
            type="button"
            onClick={() => props.onChangeSpotBrushMode('erase')}
            className={`min-h-[38px] rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              props.spotBrushMode === 'erase'
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Alpha Cutout</span>
          </button>
        </div>

        <PrecisionSlider
          label="Brush Size"
          icon={Brush}
          value={Math.round(props.spotBrushSize * 1000)}
          min={8}
          max={120}
          step={2}
          defaultValue={32}
          unit="px"
          onChange={(v) => props.onChangeSpotBrushSize(v / 1000)}
        />

        <PrecisionSlider
          label="Edge Feather"
          icon={Feather}
          value={Math.round(props.spotBrushFeather * 100)}
          min={0}
          max={100}
          step={5}
          defaultValue={25}
          unit="%"
          onChange={(v) => props.onChangeSpotBrushFeather(v / 100)}
        />

        {/* Mark Controls */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={props.onUndoSpotStroke}
            disabled={props.pendingSpotStrokes.length === 0}
            className="min-h-[36px] rounded-lg bg-[#141414] border border-white/12 text-xs text-neutral-300 hover:text-white disabled:opacity-35 flex items-center justify-center gap-1 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={props.onToggleSpotOverlay}
            className="min-h-[36px] rounded-lg bg-[#141414] border border-white/12 text-xs text-neutral-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
          >
            {props.showSpotOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Marks</span>
          </button>
          <button
            type="button"
            onClick={props.onClearPendingSpots}
            disabled={props.pendingSpotStrokes.length === 0}
            className="min-h-[36px] rounded-lg bg-[#141414] border border-white/12 text-xs text-neutral-300 hover:text-white disabled:opacity-35 flex items-center justify-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Apply Spot Removal */}
        <button
          type="button"
          onClick={props.onApplySpotRemoval}
          disabled={props.pendingSpotStrokes.length === 0}
          className="w-full min-h-[44px] rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 disabled:opacity-35 transition-colors cursor-pointer"
        >
          <Wand2 className="w-4 h-4" />
          <span>
            Apply Spot Removal ({props.pendingSpotStrokes.length}{' '}
            {props.pendingSpotStrokes.length === 1 ? 'mark' : 'marks'})
          </span>
        </button>

        {/* Direct Crisp PNG Export */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <button
            type="button"
            onClick={props.onExportSpotPng}
            className="w-full min-h-[42px] rounded-xl bg-[#191919] border border-white/25 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Clean Lossless PNG</span>
          </button>

          {activeClip.processedSrc && (
            <button
              type="button"
              onClick={props.onResetSpotImage}
              className="w-full min-h-[36px] rounded-lg text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Original Unedited Image</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 7. KEYFRAMES ENGINE
  const sortedKfs = [...activeClip.keyframes].sort((a, b) => a.time - b.time);
  const currentVals = evaluateKeyframes(activeClip.keyframes, activeClipLocalTime);
  const exactKf = sortedKfs.find((k) => Math.abs(k.time - activeClipLocalTime) < 0.08);
  const prevKf = [...sortedKfs].reverse().find((k) => k.time < activeClipLocalTime - 0.08);
  const nextKf = sortedKfs.find((k) => k.time > activeClipLocalTime + 0.08);

  const commitKfField = (patch: Partial<KeyframeValues>) => {
    props.onAddOrUpdateKeyframe(
      activeClip.id,
      {...currentVals, ...patch},
      exactKf?.easing ?? kfEasing,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Keyframes</h3>
          <p className="text-xs text-neutral-400 font-mono-num">
            Clip @ {activeClipLocalTime.toFixed(2)}s · {sortedKfs.length} keys
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!prevKf}
            onClick={() => prevKf && props.onSeekGlobal(activeClipStartTime + prevKf.time)}
            className="w-8 h-8 rounded-lg bg-[#141414] border border-white/12 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
            title="Previous keyframe"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (exactKf) {
                props.onDeleteKeyframeAtPlayhead(activeClip.id);
              } else {
                props.onAddOrUpdateKeyframe(activeClip.id, currentVals, kfEasing);
              }
            }}
            className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border cursor-pointer transition-colors ${
              exactKf
                ? 'bg-white text-black border-white'
                : 'bg-[#181818] text-white border-white/25 hover:bg-white hover:text-black'
            }`}
            title={exactKf ? 'Remove keyframe at playhead' : 'Add keyframe at playhead'}
          >
            <Diamond className="w-3.5 h-3.5 fill-current" />
            <span>{exactKf ? 'Remove' : 'Add Key'}</span>
          </button>
          <button
            type="button"
            disabled={!nextKf}
            onClick={() => nextKf && props.onSeekGlobal(activeClipStartTime + nextKf.time)}
            className="w-8 h-8 rounded-lg bg-[#141414] border border-white/12 flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
            title="Next keyframe"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Easing Curve Selector */}
      <div className="space-y-1.5">
        <span className="text-xs text-neutral-400">Interpolation Curve</span>
        <div className="grid grid-cols-5 gap-1">
          {EASING_OPTIONS.map((e) => {
            const active = (exactKf?.easing ?? kfEasing) === e.id;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  setKfEasing(e.id);
                  if (exactKf) {
                    props.onAddOrUpdateKeyframe(activeClip.id, currentVals, e.id);
                  }
                }}
                className={`min-h-[32px] rounded-md text-[10px] font-medium border cursor-pointer transition-colors ${
                  active
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#121212] text-neutral-400 border-white/10 hover:text-white'
                }`}
              >
                {e.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Animatable Keyframe Parameters */}
      <div className="space-y-3.5">
        <PrecisionSlider
          label="Zoom / Scale"
          icon={ZoomIn}
          value={Math.round(currentVals.scale)}
          min={20}
          max={250}
          step={1}
          defaultValue={100}
          unit="%"
          onChange={(v) => commitKfField({scale: v})}
        />
        <PrecisionSlider
          label="Position X"
          icon={ArrowLeftRight}
          value={Math.round(currentVals.posX)}
          min={-80}
          max={80}
          step={1}
          defaultValue={0}
          unit="%"
          showSign
          onChange={(v) => commitKfField({posX: v})}
        />
        <PrecisionSlider
          label="Position Y"
          icon={ArrowUpDown}
          value={Math.round(currentVals.posY)}
          min={-80}
          max={80}
          step={1}
          defaultValue={0}
          unit="%"
          showSign
          onChange={(v) => commitKfField({posY: v})}
        />
        <PrecisionSlider
          label="Rotation"
          icon={RotateCw}
          value={Math.round(currentVals.rotation)}
          min={-180}
          max={180}
          step={1}
          defaultValue={0}
          unit="°"
          showSign
          onChange={(v) => commitKfField({rotation: v})}
        />
        <PrecisionSlider
          label="Opacity"
          icon={Eye}
          value={Math.round(currentVals.opacity)}
          min={0}
          max={100}
          step={1}
          defaultValue={100}
          unit="%"
          onChange={(v) => commitKfField({opacity: v})}
        />
        <PrecisionSlider
          label="Mask Scale"
          icon={Maximize2}
          value={Math.round(currentVals.maskScale)}
          min={20}
          max={200}
          step={1}
          defaultValue={100}
          unit="%"
          onChange={(v) => commitKfField({maskScale: v})}
        />
      </div>

      {/* Keyframe Node Jump List */}
      {sortedKfs.length > 0 && (
        <div className="pt-2 border-t border-white/10 space-y-1.5">
          <span className="text-[11px] text-neutral-400">Saved Keyframes</span>
          <div className="space-y-1 max-h-[140px] overflow-y-auto studio-scroll">
            {sortedKfs.map((kf) => (
              <button
                key={kf.id}
                type="button"
                onClick={() => props.onSeekGlobal(activeClipStartTime + kf.time)}
                className="w-full px-2.5 py-2 rounded-lg bg-[#121212] border border-white/10 hover:border-white/35 flex items-center justify-between text-xs cursor-pointer"
              >
                <span className="inline-flex items-center gap-2 font-mono-num text-white">
                  <Diamond className="w-3 h-3 fill-white" />
                  <span>{kf.time.toFixed(2)}s</span>
                </span>
                <span className="text-[11px] text-neutral-400 font-mono-num">
                  {Math.round(kf.values.scale)}% · {Math.round(kf.values.rotation)}° · {kf.easing}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
