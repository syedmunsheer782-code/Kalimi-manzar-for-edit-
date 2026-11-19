import React, {useRef} from 'react';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Clock,
  Eye,
  Film,
  Image as ImageIcon,
  PictureInPicture2,
  Plus,
  RotateCw,
  Square,
  SquareRoundCorner,
  Timer,
  Upload,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
} from 'lucide-react';
import {MediaClip, PipLayer} from '../../types/editor';
import {PrecisionSlider} from '../PrecisionSlider';

interface PipStudioPanelProps {
  pipLayers: PipLayer[];
  activePipId: string | null;
  clips: MediaClip[];
  totalDuration: number;
  onSelectPip: (id: string) => void;
  onAddPipFiles: (files: FileList) => Promise<void>;
  onAddPipFromClip: (clip: MediaClip) => void;
  onUpdatePip: (id: string, patch: Partial<PipLayer>) => void;
  onDeletePip: (id: string) => void;
}

const POSITION_PRESETS: {label: string; x: number; y: number}[] = [
  {label: 'Top L', x: 22, y: 24},
  {label: 'Top R', x: 78, y: 24},
  {label: 'Center', x: 50, y: 50},
  {label: 'Bot L', x: 22, y: 76},
  {label: 'Bot R', x: 78, y: 76},
];

const SHAPE_PRESETS: {label: string; radius: number; border: number}[] = [
  {label: 'Sharp', radius: 0, border: 2},
  {label: 'Rounded', radius: 14, border: 2},
  {label: 'Circle', radius: 50, border: 3},
  {label: 'Clean', radius: 8, border: 0},
];

export const PipStudioPanel: React.FC<PipStudioPanelProps> = ({
  pipLayers,
  activePipId,
  clips,
  totalDuration,
  onSelectPip,
  onAddPipFiles,
  onAddPipFromClip,
  onUpdatePip,
  onDeletePip,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activePip = pipLayers.find((p) => p.id === activePipId) ?? pipLayers[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Header & Add PIP CTA */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">PIP Video &amp; Photo Overlay</h3>
          <p className="text-xs text-neutral-400">
            Drag &amp; resize overlay directly on preview canvas
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*"
          onChange={(e) => {
            if (e.target.files?.length) onAddPipFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add PIP</span>
        </button>
      </div>

      {/* PIP Layer Switcher */}
      {pipLayers.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto studio-scroll pb-1">
          {pipLayers.map((layer, idx) => {
            const selected = layer.id === activePip?.id;
            return (
              <div
                key={layer.id}
                className={`flex items-center gap-1 rounded-lg border pl-2.5 pr-1 py-1 text-xs shrink-0 transition-colors ${
                  selected
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#141414] text-neutral-300 border-white/12 hover:border-white/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectPip(layer.id)}
                  className="inline-flex items-center gap-1 max-w-[115px] truncate cursor-pointer"
                >
                  {layer.kind === 'video' ? (
                    <Film className="w-3 h-3 shrink-0" />
                  ) : (
                    <ImageIcon className="w-3 h-3 shrink-0" />
                  )}
                  <span className="truncate">
                    PIP {idx + 1}: {layer.name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePip(layer.id)}
                  className={`p-1 rounded hover:bg-black/15 cursor-pointer ${
                    selected ? 'text-black/80 hover:text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                  title={`Remove ${layer.name}`}
                  aria-label={`Delete ${layer.name}`}
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!activePip ? (
        <div className="p-5 rounded-xl bg-[#111111] border border-white/10 space-y-3.5 text-center">
          <PictureInPicture2 className="w-7 h-7 text-neutral-300 mx-auto" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-white">Place Secondary Video or Photo</p>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Import a secondary video or image overlay to layer on top of your main track with
              touch drag, corner resize handles, and its own timeline track.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[40px] rounded-xl bg-white text-black text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Video or Photo Overlay</span>
          </button>

          {clips.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-2 text-left">
              <span className="text-[11px] text-neutral-400">Or use an existing clip as PIP</span>
              <div className="grid grid-cols-2 gap-1.5">
                {clips.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onAddPipFromClip(c)}
                    className="px-2.5 py-2 rounded-lg bg-[#161616] border border-white/12 hover:border-white/40 text-[11px] text-neutral-200 hover:text-white flex items-center gap-1.5 truncate cursor-pointer transition-colors"
                  >
                    {c.kind === 'video' ? (
                      <Film className="w-3 h-3 shrink-0 text-neutral-400" />
                    ) : (
                      <ImageIcon className="w-3 h-3 shrink-0 text-neutral-400" />
                    )}
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Corner Position Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">Quick Placement</span>
              <button
                type="button"
                onClick={() => onUpdatePip(activePip.id, {muted: !activePip.muted})}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                  activePip.muted
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#141414] text-neutral-300 border-white/12 hover:text-white'
                }`}
              >
                {activePip.muted ? (
                  <VolumeX className="w-3 h-3" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
                <span>{activePip.muted ? 'PIP Muted' : 'Audio On'}</span>
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {POSITION_PRESETS.map((pos) => (
                <button
                  key={pos.label}
                  type="button"
                  onClick={() => onUpdatePip(activePip.id, {x: pos.x, y: pos.y})}
                  className="min-h-[32px] rounded-lg bg-[#141414] border border-white/12 text-[11px] text-neutral-200 hover:bg-white hover:text-black transition-colors cursor-pointer"
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frame Shape Presets */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-neutral-400">Frame Style</span>
            <div className="grid grid-cols-4 gap-1">
              {SHAPE_PRESETS.map((sh) => {
                const isMatch =
                  activePip.borderRadius === sh.radius && activePip.borderWidth === sh.border;
                return (
                  <button
                    key={sh.label}
                    type="button"
                    onClick={() =>
                      onUpdatePip(activePip.id, {
                        borderRadius: sh.radius,
                        borderWidth: sh.border,
                      })
                    }
                    className={`min-h-[32px] rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                      isMatch
                        ? 'bg-white text-black border-white font-semibold'
                        : 'bg-[#141414] text-neutral-300 border-white/12 hover:border-white/35'
                    }`}
                  >
                    {sh.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tactile +/- Precision Sliders with Clear Icons Above Every Bar */}
          <div className="space-y-3.5">
            <PrecisionSlider
              label="Overlay Size"
              icon={ZoomIn}
              value={Math.round(activePip.scale > 0 ? activePip.scale : 34)}
              min={10}
              max={100}
              step={1}
              defaultValue={34}
              unit="%"
              onChange={(v) => onUpdatePip(activePip.id, {scale: v})}
            />
            <PrecisionSlider
              label="Position X"
              icon={ArrowLeftRight}
              value={Math.round(activePip.x)}
              min={5}
              max={95}
              step={1}
              defaultValue={76}
              unit="%"
              onChange={(v) => onUpdatePip(activePip.id, {x: v})}
            />
            <PrecisionSlider
              label="Position Y"
              icon={ArrowUpDown}
              value={Math.round(activePip.y)}
              min={5}
              max={95}
              step={1}
              defaultValue={26}
              unit="%"
              onChange={(v) => onUpdatePip(activePip.id, {y: v})}
            />
            <PrecisionSlider
              label="Rotation"
              icon={RotateCw}
              value={Math.round(activePip.rotation)}
              min={-180}
              max={180}
              step={1}
              defaultValue={0}
              unit="°"
              showSign
              onChange={(v) => onUpdatePip(activePip.id, {rotation: v})}
            />
            <PrecisionSlider
              label="Opacity"
              icon={Eye}
              value={Math.round(activePip.opacity)}
              min={0}
              max={100}
              step={1}
              defaultValue={100}
              unit="%"
              onChange={(v) => onUpdatePip(activePip.id, {opacity: v})}
            />
            <PrecisionSlider
              label="Corner Roundness"
              icon={SquareRoundCorner}
              value={Math.round(activePip.borderRadius)}
              min={0}
              max={50}
              step={1}
              defaultValue={10}
              unit="%"
              onChange={(v) => onUpdatePip(activePip.id, {borderRadius: v})}
            />
            <PrecisionSlider
              label="White Border"
              icon={Square}
              value={activePip.borderWidth}
              min={0}
              max={12}
              step={1}
              defaultValue={2}
              unit="px"
              onChange={(v) => onUpdatePip(activePip.id, {borderWidth: v})}
            />
            <PrecisionSlider
              label="Start Time"
              icon={Clock}
              value={Number(activePip.startTime.toFixed(1))}
              min={0}
              max={Math.max(5, Math.ceil(totalDuration))}
              step={0.1}
              defaultValue={0}
              unit="s"
              onChange={(v) => onUpdatePip(activePip.id, {startTime: v})}
            />
            <PrecisionSlider
              label="Duration"
              icon={Timer}
              value={Number(activePip.duration.toFixed(1))}
              min={0.5}
              max={Math.max(10, Math.ceil(totalDuration))}
              step={0.2}
              defaultValue={4}
              unit="s"
              onChange={(v) => onUpdatePip(activePip.id, {duration: v})}
            />
            {activePip.kind === 'video' && (
              <PrecisionSlider
                label="PIP Volume"
                icon={Volume2}
                value={activePip.muted ? 0 : activePip.volume}
                min={0}
                max={100}
                step={1}
                defaultValue={100}
                unit="%"
                onChange={(v) => onUpdatePip(activePip.id, {volume: v, muted: v === 0})}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
