import React, {useMemo, useRef, useState} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  ArrowUpDown,
  Bold,
  Clock,
  Eye,
  Gauge,
  MoveHorizontal,
  Play,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Square,
  Timer,
  Trash2,
  Type,
  Upload,
  ZoomIn,
} from 'lucide-react';
import {FONT_CATEGORIES, FONT_LIBRARY, FontCategory, FontItem} from '../../data/fonts';
import {TEXT_ANIMATIONS_12} from '../../data/textAnimations';
import {
  TEXT_EFFECT_CATEGORIES,
  TEXT_EFFECTS_100,
  TextEffectCategory,
  TextEffectPreset,
} from '../../data/textEffects';
import {TextAnimationId, TextLayer} from '../../types/editor';
import {PrecisionSlider} from '../PrecisionSlider';

interface TextStudioPanelProps {
  textLayers: TextLayer[];
  activeTextId: string | null;
  customFonts: FontItem[];
  onImportCustomFonts: (files: FileList) => Promise<void>;
  onDeleteCustomFont: (fontId: string) => Promise<void>;
  onSelectText: (id: string) => void;
  onAddText: () => void;
  onDeleteText: (id: string) => void;
  onUpdateText: (id: string, patch: Partial<TextLayer>) => void;
}

const SWATCH_COLORS = [
  '#FFFFFF',
  '#000000',
  '#D4D4D8',
  '#FACC15',
  '#EF4444',
  '#22C55E',
  '#38BDF8',
  '#F97316',
];

export const TextStudioPanel: React.FC<TextStudioPanelProps> = ({
  textLayers,
  activeTextId,
  customFonts,
  onImportCustomFonts,
  onDeleteCustomFont,
  onSelectText,
  onAddText,
  onDeleteText,
  onUpdateText,
}) => {
  const [subTab, setSubTab] = useState<'animate' | 'effects' | 'fonts' | 'content'>('animate');
  const [fontCategory, setFontCategory] = useState<FontCategory>('All');
  const [effectCategory, setEffectCategory] = useState<TextEffectCategory>('All');
  const [effectSearch, setEffectSearch] = useState('');
  const [fontImportBusy, setFontImportBusy] = useState(false);
  const fontInputRef = useRef<HTMLInputElement | null>(null);

  const activeLayer = textLayers.find((t) => t.id === activeTextId) ?? textLayers[0] ?? null;

  const allFonts = useMemo(() => [...customFonts, ...FONT_LIBRARY], [customFonts]);

  const filteredFonts = useMemo(
    () =>
      fontCategory === 'All'
        ? allFonts
        : allFonts.filter((f) => f.category === fontCategory),
    [allFonts, fontCategory],
  );

  const filteredEffects = useMemo(() => {
    const q = effectSearch.trim().toLowerCase();
    return TEXT_EFFECTS_100.filter((fx) => {
      const catMatch = effectCategory === 'All' || fx.category === effectCategory;
      const qMatch =
        !q ||
        fx.name.toLowerCase().includes(q) ||
        fx.category.toLowerCase().includes(q) ||
        String(fx.index).includes(q);
      return catMatch && qMatch;
    });
  }, [effectCategory, effectSearch]);

  const getTilePreviewStyle = (fx: TextEffectPreset): React.CSSProperties => {
    const style: React.CSSProperties = {
      color: fx.fillStyle === 'hollow' ? 'transparent' : fx.fillColors[0],
      textTransform: fx.uppercase ? 'uppercase' : 'none',
      fontStyle: fx.italic ? 'italic' : 'normal',
      WebkitTextStroke:
        fx.fillStyle === 'hollow'
          ? `1.5px ${fx.strokeColor ?? '#FFFFFF'}`
          : fx.strokeWidth && fx.strokeWidth >= 6
            ? `1px ${fx.strokeColor ?? '#000000'}`
            : undefined,
      textShadow: fx.glowColor
        ? `0 0 10px ${fx.glowColor}`
        : fx.rgbSplit
          ? `-1.5px 0 rgba(255,45,85,0.85), 1.5px 0 rgba(0,225,255,0.85)`
          : fx.extrudeDepth
            ? `2px 2px 0 ${fx.extrudeColor ?? '#262626'}`
            : fx.shadowColor
              ? `0 2px 4px ${fx.shadowColor}`
              : undefined,
      backgroundColor: fx.boxBg && fx.boxBg !== 'transparent' ? fx.boxBg : undefined,
      border: fx.boxBorder ? `1px solid ${fx.boxBorder}` : undefined,
      padding: fx.boxBg || fx.boxBorder ? '2px 6px' : undefined,
      borderRadius: fx.boxRadius ? Math.min(8, fx.boxRadius) : undefined,
    };
    return style;
  };

  return (
    <div className="space-y-4">
      {/* Header & Layer Selector */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Text &amp; 100 YouTube FX</h3>
          <p className="text-xs text-neutral-400">Clean to Heavy fonts · 100 animated styles</p>
        </div>
        <button
          type="button"
          onClick={onAddText}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Text</span>
        </button>
      </div>

      {/* Layer Switcher */}
      {textLayers.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto studio-scroll pb-1">
          {textLayers.map((layer, idx) => (
            <div
              key={layer.id}
              className={`flex items-center gap-1 rounded-lg border pl-2.5 pr-1 py-1 text-xs shrink-0 transition-colors ${
                layer.id === activeLayer?.id
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-[#141414] text-neutral-300 border-white/12 hover:border-white/30'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectText(layer.id)}
                className="max-w-[110px] truncate cursor-pointer"
              >
                T{idx + 1}: {layer.text || 'Untitled'}
              </button>
              <button
                type="button"
                onClick={() => onDeleteText(layer.id)}
                className={`p-1 rounded hover:bg-black/15 cursor-pointer ${
                  layer.id === activeLayer?.id ? 'text-black/70' : 'text-neutral-500 hover:text-white'
                }`}
                aria-label="Delete text layer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!activeLayer ? (
        <div className="p-6 rounded-xl bg-[#111111] border border-white/10 text-center space-y-3">
          <Type className="w-7 h-7 text-neutral-400 mx-auto" />
          <p className="text-xs text-neutral-400">
            Add a text layer to unlock the full font library and 100 YouTube-style animated effects.
          </p>
          <button
            type="button"
            onClick={onAddText}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Text Layer</span>
          </button>
        </div>
      ) : (
        <>
          {/* Text Input */}
          <textarea
            rows={2}
            value={activeLayer.text}
            onChange={(e) => onUpdateText(activeLayer.id, {text: e.target.value})}
            placeholder="Enter title or caption..."
            className="w-full rounded-xl bg-[#121212] border border-white/15 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white resize-none"
          />

          {/* Sub-Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#121212] border border-white/10">
            <button
              type="button"
              onClick={() => setSubTab('animate')}
              className={`min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                subTab === 'animate' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Play className="w-3 h-3" />
              <span>Animate</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('effects')}
              className={`min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                subTab === 'effects' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>100 FX</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('fonts')}
              className={`min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                subTab === 'fonts' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Fonts
            </button>
            <button
              type="button"
              onClick={() => setSubTab('content')}
              className={`min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                subTab === 'content' ? 'bg-white text-black font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Style
            </button>
          </div>

          {/* SUBTAB 0: 12 LIGHTWEIGHT SMOOTH TEXT ANIMATIONS */}
          {subTab === 'animate' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-400">
                  12 smooth lightweight CSS/transform animations
                </span>
                {(activeLayer.textAnimation ?? 'none') !== 'none' && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateText(activeLayer.id, {textAnimation: 'none'})
                    }
                    className="px-2 py-1 rounded-md bg-[#181818] border border-white/15 text-[11px] text-neutral-300 hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <PrecisionSlider
                label="Animation Speed"
                icon={Gauge}
                value={activeLayer.animSpeed}
                min={0.25}
                max={3}
                step={0.1}
                defaultValue={1}
                unit="x"
                onChange={(v) => onUpdateText(activeLayer.id, {animSpeed: v})}
              />

              <div className="grid grid-cols-3 gap-2">
                {TEXT_ANIMATIONS_12.map((anim) => {
                  const selected = (activeLayer.textAnimation ?? 'none') === anim.id;
                  return (
                    <button
                      key={anim.id}
                      type="button"
                      onClick={() =>
                        onUpdateText(activeLayer.id, {
                          textAnimation: (selected ? 'none' : anim.id) as TextAnimationId,
                        })
                      }
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[76px] overflow-hidden ${
                        selected
                          ? 'bg-white text-black border-white ring-1 ring-white/80'
                          : 'bg-[#0f0f0f] text-white border-white/12 hover:border-white/40'
                      }`}
                    >
                      <div className="w-full h-9 rounded-lg flex items-center justify-center overflow-hidden bg-black/85 border border-white/10">
                        <span
                          className={`text-sm font-bold tracking-tight text-white select-none will-change-transform ${anim.cssClass}`}
                        >
                          Abc
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-semibold mt-1.5 leading-tight truncate w-full ${
                          selected ? 'text-black' : 'text-white'
                        }`}
                      >
                        {anim.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBTAB 1: 100 YOUTUBE TEXT EFFECTS & ANIMATIONS */}
          {subTab === 'effects' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={effectSearch}
                  onChange={(e) => setEffectSearch(e.target.value)}
                  placeholder="Search 100 YouTube effects (pop, glitch, 3D, neon...)"
                  className="w-full h-9 pl-8 pr-3 rounded-lg bg-[#121212] border border-white/12 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto studio-scroll pb-1">
                {TEXT_EFFECT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEffectCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      effectCategory === cat
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#141414] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <PrecisionSlider
                label="Animation Speed"
                icon={Gauge}
                value={activeLayer.animSpeed}
                min={0.25}
                max={3}
                step={0.1}
                defaultValue={1}
                unit="x"
                onChange={(v) => onUpdateText(activeLayer.id, {animSpeed: v})}
              />

              <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto studio-scroll pr-1">
                {filteredEffects.map((fx) => {
                  const selected = activeLayer.effectId === fx.id;
                  return (
                    <button
                      key={fx.id}
                      type="button"
                      onClick={() => onUpdateText(activeLayer.id, {effectId: fx.id})}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${
                        selected
                          ? 'bg-[#1c1c1c] border-white ring-1 ring-white/70'
                          : 'bg-[#0f0f0f] border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="font-mono-num text-[10px] text-neutral-500">
                          #{String(fx.index).padStart(3, '0')}
                        </span>
                        <span className="text-[10px] text-neutral-500 truncate">
                          {fx.motion}
                        </span>
                      </div>
                      <div className="py-1 flex items-center justify-center overflow-hidden">
                        <span
                          className="text-sm font-extrabold tracking-tight truncate max-w-full"
                          style={getTilePreviewStyle(fx)}
                        >
                          {fx.name.split(' ').slice(0, 2).join(' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 truncate w-full">
                        {fx.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBTAB 2: FULL FONT LIBRARY + CUSTOM .TTF / .OTF IMPORT */}
          {subTab === 'fonts' && (
            <div className="space-y-3">
              {/* Custom Add Font (.ttf / .otf) Action Bar */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-400">
                  {customFonts.length > 0
                    ? `${customFonts.length} custom · ${FONT_LIBRARY.length} built-in`
                    : `${FONT_LIBRARY.length} built-in fonts`}
                </span>
                <input
                  ref={fontInputRef}
                  type="file"
                  multiple
                  accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,application/x-font-ttf,application/x-font-opentype"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    setFontImportBusy(true);
                    try {
                      await onImportCustomFonts(files);
                      setFontCategory('Custom');
                    } finally {
                      setFontImportBusy(false);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={fontImportBusy}
                  onClick={() => fontInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
                  title="Import custom .ttf or .otf font files from device storage"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{fontImportBusy ? 'Importing...' : 'Add Font (.ttf/.otf)'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto studio-scroll pb-1">
                {FONT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFontCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      fontCategory === cat
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#141414] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat === 'Custom' ? `Custom (${customFonts.length})` : cat}
                  </button>
                ))}
              </div>

              {filteredFonts.length === 0 ? (
                <div className="p-5 rounded-xl bg-[#0f0f0f] border border-white/10 text-center space-y-2.5">
                  <p className="text-xs text-neutral-400">
                    No custom fonts imported yet. Tap Add Font to import any .ttf or .otf file from
                    your device.
                  </p>
                  <button
                    type="button"
                    onClick={() => fontInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Font</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[360px] overflow-y-auto studio-scroll pr-1">
                  {filteredFonts.map((font) => {
                    const selected = activeLayer.fontFamily === font.family;
                    return (
                      <div
                        key={font.id}
                        className={`w-full rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          selected
                            ? 'bg-white text-black border-white'
                            : 'bg-[#101010] text-white border-white/10 hover:border-white/30'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateText(activeLayer.id, {
                              fontFamily: font.family,
                              fontWeight: font.defaultWeight,
                            })
                          }
                          className="flex-1 min-w-0 px-3 py-2.5 text-left cursor-pointer"
                        >
                          <div
                            className="text-base truncate leading-tight"
                            style={{fontFamily: font.family, fontWeight: font.defaultWeight}}
                          >
                            {font.sample}
                          </div>
                          <div
                            className={`text-[11px] mt-0.5 ${
                              selected ? 'text-neutral-700' : 'text-neutral-400'
                            }`}
                          >
                            {font.name} · {font.category}
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5 pr-2.5 shrink-0">
                          <span
                            className={`font-mono-num text-[10px] ${
                              selected ? 'text-neutral-700' : 'text-neutral-500'
                            }`}
                          >
                            {font.defaultWeight}
                          </span>
                          {font.isCustom && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomFont(font.id)}
                              className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                                selected
                                  ? 'text-black/70 hover:bg-black/10'
                                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
                              }`}
                              title={`Remove ${font.name}`}
                              aria-label={`Remove custom font ${font.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: STYLE, COLOR & POSITION */}
          {subTab === 'content' && (
            <div className="space-y-4">
              {/* Alignment & Color Swatches */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#141414] border border-white/10">
                  {(
                    [
                      ['left', AlignLeft],
                      ['center', AlignCenter],
                      ['right', AlignRight],
                    ] as const
                  ).map(([alignKey, Icon]) => (
                    <button
                      key={alignKey}
                      type="button"
                      onClick={() => onUpdateText(activeLayer.id, {align: alignKey})}
                      className={`w-8 h-8 rounded flex items-center justify-center cursor-pointer transition-colors ${
                        activeLayer.align === alignKey
                          ? 'bg-white text-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      aria-label={`Align ${alignKey}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {SWATCH_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onUpdateText(activeLayer.id, {color: hex})}
                      className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                        activeLayer.color === hex
                          ? 'border-white scale-110 ring-1 ring-white'
                          : 'border-white/25'
                      }`}
                      style={{backgroundColor: hex}}
                      aria-label={`Color ${hex}`}
                    />
                  ))}
                </div>
              </div>

              <PrecisionSlider
                label="Font Size"
                icon={Type}
                value={activeLayer.fontSize > 0 ? activeLayer.fontSize : 76}
                min={18}
                max={180}
                step={2}
                defaultValue={76}
                unit="px"
                onChange={(v) => onUpdateText(activeLayer.id, {fontSize: v})}
              />
              <PrecisionSlider
                label="Text Size (Scale)"
                icon={ZoomIn}
                value={Math.round(activeLayer.scale > 0 ? activeLayer.scale : 100)}
                min={20}
                max={300}
                step={1}
                defaultValue={100}
                unit="%"
                onChange={(v) => onUpdateText(activeLayer.id, {scale: v})}
              />
              <PrecisionSlider
                label="Font Weight"
                icon={Bold}
                value={activeLayer.fontWeight}
                min={300}
                max={900}
                step={100}
                defaultValue={700}
                onChange={(v) => onUpdateText(activeLayer.id, {fontWeight: v})}
              />
              <PrecisionSlider
                label="Letter Spacing"
                icon={MoveHorizontal}
                value={activeLayer.letterSpacing}
                min={-6}
                max={32}
                step={1}
                defaultValue={0}
                unit="px"
                showSign
                onChange={(v) => onUpdateText(activeLayer.id, {letterSpacing: v})}
              />
              <PrecisionSlider
                label="Outline Stroke"
                icon={Square}
                value={activeLayer.strokeWidth}
                min={0}
                max={20}
                step={1}
                defaultValue={0}
                unit="px"
                onChange={(v) => onUpdateText(activeLayer.id, {strokeWidth: v})}
              />
              <PrecisionSlider
                label="Position X"
                icon={ArrowLeftRight}
                value={activeLayer.x}
                min={5}
                max={95}
                step={1}
                defaultValue={50}
                unit="%"
                onChange={(v) => onUpdateText(activeLayer.id, {x: v})}
              />
              <PrecisionSlider
                label="Position Y"
                icon={ArrowUpDown}
                value={activeLayer.y}
                min={5}
                max={95}
                step={1}
                defaultValue={50}
                unit="%"
                onChange={(v) => onUpdateText(activeLayer.id, {y: v})}
              />
              <PrecisionSlider
                label="Rotation"
                icon={RotateCw}
                value={activeLayer.rotation}
                min={-180}
                max={180}
                step={1}
                defaultValue={0}
                unit="°"
                showSign
                onChange={(v) => onUpdateText(activeLayer.id, {rotation: v})}
              />
              <PrecisionSlider
                label="Opacity"
                icon={Eye}
                value={activeLayer.opacity}
                min={0}
                max={100}
                step={1}
                defaultValue={100}
                unit="%"
                onChange={(v) => onUpdateText(activeLayer.id, {opacity: v})}
              />
              <PrecisionSlider
                label="Start Time"
                icon={Clock}
                value={activeLayer.startTime}
                min={0}
                max={60}
                step={0.1}
                defaultValue={0}
                unit="s"
                onChange={(v) => onUpdateText(activeLayer.id, {startTime: v})}
              />
              <PrecisionSlider
                label="Duration"
                icon={Timer}
                value={activeLayer.duration}
                min={0.5}
                max={60}
                step={0.2}
                defaultValue={4}
                unit="s"
                onChange={(v) => onUpdateText(activeLayer.id, {duration: v})}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
