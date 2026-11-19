import React, {useRef, useState} from 'react';
import {
  Activity,
  AudioLines,
  Check,
  Download,
  FileAudio,
  Film,
  Library,
  Mic,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  ShieldAlert,
  Square,
  Trash2,
  Upload,
  Volume2,
  Wand2,
  Waves,
} from 'lucide-react';
import {AudioNRConfig, MediaClip} from '../../types/editor';
import {
  analyzeAudioBlob,
  extractAudioFromVideoSrc,
  processOfflineVoiceNR,
} from '../../utils/audioProcessor';
import {AudioLibraryItem} from '../../utils/offlineLibrary';
import {PrecisionSlider} from '../PrecisionSlider';

interface AudioNRPanelProps {
  audioNR: AudioNRConfig;
  activeClip: MediaClip | null;
  clips: MediaClip[];
  audioLibrary: AudioLibraryItem[];
  onUpdateClip?: (clipId: string, patch: Partial<MediaClip>) => void;
  onUpdateAudioNR: (patch: Partial<AudioNRConfig>) => void;
  onSaveAudioToLibrary: (
    item: Omit<AudioLibraryItem, 'id' | 'createdAt' | 'objectUrl'>,
  ) => Promise<AudioLibraryItem>;
  onRenameAudioInLibrary: (id: string, nextName: string) => Promise<void>;
  onDeleteAudioFromLibrary: (id: string) => Promise<void>;
}

type AudioSubTab = 'nr' | 'extract' | 'library';

export const AudioNRPanel: React.FC<AudioNRPanelProps> = ({
  audioNR,
  activeClip,
  clips,
  audioLibrary,
  onUpdateClip,
  onUpdateAudioNR,
  onSaveAudioToLibrary,
  onRenameAudioInLibrary,
  onDeleteAudioFromLibrary,
}) => {
  const [subTab, setSubTab] = useState<AudioSubTab>('nr');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const extractVideoInputRef = useRef<HTMLInputElement | null>(null);
  const libraryAudioInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [beforePeaks, setBeforePeaks] = useState<number[]>([]);
  const [afterPeaks, setAfterPeaks] = useState<number[]>([]);
  const [cleanedUrl, setCleanedUrl] = useState<string | null>(null);
  const [cleanedBlob, setCleanedBlob] = useState<Blob | null>(null);
  const [cleanedDuration, setCleanedDuration] = useState<number>(0);
  const [playingLibraryId, setPlayingLibraryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');

  const videoClips = clips.filter((c) => c.kind === 'video');
  const targetAudioSrc =
    audioNR.trackSrc || (activeClip?.kind === 'video' ? activeClip.src : undefined);

  const formatDuration = (sec: number) => {
    if (!sec || !Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>, autoSaveToLibrary = false) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const url = URL.createObjectURL(file);
    onUpdateAudioNR({
      enabled: true,
      trackName: file.name,
      trackSrc: url,
      trackMimeType: file.type || 'audio/mpeg',
    });
    setCleanedUrl(null);
    setCleanedBlob(null);

    if (autoSaveToLibrary) {
      const analyzed = await analyzeAudioBlob(file);
      await onSaveAudioToLibrary({
        name: file.name.replace(/\.[^.]+$/, ''),
        mimeType: file.type || 'audio/mpeg',
        duration: analyzed.duration,
        sizeBytes: file.size,
        sourceType: 'imported',
        peaks: analyzed.peaks,
        blob: file,
      });
      setStatusMsg(`Saved "${file.name}" into My Audio Library.`);
    } else {
      setStatusMsg(`Loaded ${file.name}`);
    }
  };

  const handleToggleRecord = async () => {
    if (isRecording && recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {type: 'audio/webm'});
        const url = URL.createObjectURL(blob);
        const recName = `Voiceover_${new Date().toLocaleTimeString().replace(/:/g, '-')}`;
        onUpdateAudioNR({
          enabled: true,
          trackName: `${recName}.webm`,
          trackSrc: url,
          trackMimeType: 'audio/webm',
        });
        setCleanedUrl(null);
        setCleanedBlob(null);

        // Save recording straight into My Audio Library
        const analyzed = await analyzeAudioBlob(blob);
        await onSaveAudioToLibrary({
          name: recName,
          mimeType: 'audio/webm',
          duration: analyzed.duration,
          sizeBytes: blob.size,
          sourceType: 'recorded',
          peaks: analyzed.peaks,
          blob,
        });
        setStatusMsg('Voiceover recorded & saved to My Audio Library.');
      };
      recorderRef.current = rec;
      rec.start();
      setIsRecording(true);
      setStatusMsg('Recording microphone offline...');
    } catch {
      setStatusMsg('Microphone permission unavailable. Import or extract audio instead.');
    }
  };

  const handleRunDenoise = async () => {
    if (!targetAudioSrc) {
      setStatusMsg('Import an audio/video file or select a track from My Audio Library first.');
      return;
    }
    setIsProcessing(true);
    setStatusMsg('Processing offline DSP noise reduction...');
    try {
      const result = await processOfflineVoiceNR(targetAudioSrc, {
        ...audioNR,
        enabled: true,
      });
      if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
      const nextUrl = URL.createObjectURL(result.wavBlob);
      setCleanedUrl(nextUrl);
      setCleanedBlob(result.wavBlob);
      setCleanedDuration(result.duration);
      setBeforePeaks(result.beforePeaks);
      setAfterPeaks(result.afterPeaks);
      onUpdateAudioNR({enabled: true});
      setStatusMsg(`Cleaned ${result.duration.toFixed(1)}s track offline.`);
    } catch {
      setStatusMsg('Could not decode audio stream from this clip. Try a video with audio or audio file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDenoisedToLibrary = async () => {
    if (!cleanedBlob) return;
    const baseName = (audioNR.trackName || activeClip?.name || 'Voice_Track').replace(/\.[^.]+$/, '');
    await onSaveAudioToLibrary({
      name: `${baseName} (Clean NR)`,
      mimeType: 'audio/wav',
      duration: cleanedDuration,
      sizeBytes: cleanedBlob.size,
      sourceType: 'denoised',
      peaks: afterPeaks.slice(0, 48),
      blob: cleanedBlob,
    });
    setStatusMsg('Saved denoised WAV to My Audio Library.');
    setSubTab('library');
  };

  const handleExtractFromVideo = async (srcUrl: string, rawVideoName: string) => {
    setIsExtracting(true);
    setStatusMsg(`Extracting audio track from ${rawVideoName}...`);
    try {
      const extracted = await extractAudioFromVideoSrc(srcUrl);
      const cleanName = `${rawVideoName.replace(/\.[^.]+$/, '')} Audio`;
      const saved = await onSaveAudioToLibrary({
        name: cleanName,
        mimeType: 'audio/wav',
        duration: extracted.duration,
        sizeBytes: extracted.wavBlob.size,
        sourceType: 'extracted',
        peaks: extracted.peaks,
        blob: extracted.wavBlob,
      });
      // Immediately attach extracted audio track to the project
      onUpdateAudioNR({
        trackName: `${saved.name}.wav`,
        trackSrc: saved.objectUrl,
        trackMimeType: 'audio/wav',
      });
      setStatusMsg(
        `Extracted ${formatDuration(extracted.duration)} audio & saved to My Audio Library.`,
      );
      setSubTab('library');
    } catch {
      setStatusMsg(
        `No decodable audio track found in "${rawVideoName}". Make sure the video contains an audio stream.`,
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExtractFromLocalVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const tempUrl = URL.createObjectURL(file);
    try {
      await handleExtractFromVideo(tempUrl, file.name);
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  };

  const handleDownloadWav = () => {
    if (!cleanedUrl) return;
    const a = document.createElement('a');
    a.href = cleanedUrl;
    a.download = `denoised_voice_${Date.now()}.wav`;
    a.click();
  };

  const handleDownloadLibraryItem = (item: AudioLibraryItem) => {
    const url = item.objectUrl || URL.createObjectURL(item.blob);
    const ext = item.mimeType.includes('wav')
      ? 'wav'
      : item.mimeType.includes('webm')
        ? 'webm'
        : item.mimeType.includes('ogg')
          ? 'ogg'
          : 'mp3';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name.replace(/\s+/g, '_')}.${ext}`;
    a.click();
  };

  const playAudition = (src: string, libraryId?: string) => {
    const el = previewAudioRef.current;
    if (!el) return;
    if (libraryId && playingLibraryId === libraryId && !el.paused) {
      el.pause();
      setPlayingLibraryId(null);
      return;
    }
    el.src = src;
    el.onended = () => setPlayingLibraryId(null);
    el.play().catch(() => {});
    setPlayingLibraryId(libraryId ?? null);
  };

  const handleUseLibraryTrack = (item: AudioLibraryItem) => {
    const url = item.objectUrl || URL.createObjectURL(item.blob);
    onUpdateAudioNR({
      trackName: item.name,
      trackSrc: url,
      trackMimeType: item.mimeType,
    });
    setStatusMsg(`Applied "${item.name}" to project audio track.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Audio Studio &amp; Voice NR</h3>
          <p className="text-xs text-neutral-400">
            Noise reduction · Extract from video · Offline library
          </p>
        </div>
        {subTab === 'nr' && (
          <button
            type="button"
            onClick={() => onUpdateAudioNR({enabled: !audioNR.enabled})}
            className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
              audioNR.enabled
                ? 'bg-white text-black border-white'
                : 'bg-[#141414] text-neutral-300 border-white/15 hover:border-white/40'
            }`}
          >
            {audioNR.enabled ? 'NR On' : 'Enable NR'}
          </button>
        )}
      </div>

      {/* 3-Tab Switcher: Voice NR | Extract Audio | My Audio Library */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#121212] border border-white/10">
        <button
          type="button"
          onClick={() => setSubTab('nr')}
          className={`min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
            subTab === 'nr'
              ? 'bg-white text-black font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <AudioLines className="w-3.5 h-3.5 shrink-0" />
          <span>Voice NR</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('extract')}
          className={`min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
            subTab === 'extract'
              ? 'bg-white text-black font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Film className="w-3.5 h-3.5 shrink-0" />
          <span>Extract</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('library')}
          className={`min-h-[36px] rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
            subTab === 'library'
              ? 'bg-white text-black font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Library className="w-3.5 h-3.5 shrink-0" />
          <span>Library ({audioLibrary.length})</span>
        </button>
      </div>

      {/* TAB 1: VOICE NOISE REDUCTION */}
      {subTab === 'nr' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => handleUploadAudio(e, true)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl bg-[#141414] border border-white/15 text-xs font-medium text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Audio</span>
            </button>
            <button
              type="button"
              onClick={handleToggleRecord}
              className={`flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                isRecording
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-[#141414] border-white/15 text-white hover:bg-white hover:text-black'
              }`}
            >
              {isRecording ? (
                <Square className="w-3.5 h-3.5 fill-black" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
              <span>{isRecording ? 'Stop Rec' : 'Record Voice'}</span>
            </button>
          </div>

          {targetAudioSrc && (
            <div className="px-3 py-2 rounded-lg bg-[#111111] border border-white/10 flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-neutral-200 truncate">
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{audioNR.trackName || activeClip?.name}</span>
              </span>
              <button
                type="button"
                onClick={() => playAudition(targetAudioSrc)}
                className="text-[11px] text-neutral-300 hover:text-white underline cursor-pointer shrink-0"
              >
                Original
              </button>
            </div>
          )}

          <div className="space-y-3.5 pt-1">
            {activeClip && onUpdateClip && (
              <PrecisionSlider
                label="Clip Volume"
                icon={Volume2}
                value={activeClip.muted ? 0 : activeClip.volume}
                min={0}
                max={100}
                step={1}
                defaultValue={100}
                unit="%"
                onChange={(v) => onUpdateClip(activeClip.id, {volume: v, muted: v === 0})}
              />
            )}
            <PrecisionSlider
              label="Reduction Strength"
              icon={AudioLines}
              value={audioNR.strength}
              min={0}
              max={100}
              step={1}
              defaultValue={65}
              unit="%"
              onChange={(v) => onUpdateAudioNR({strength: v, enabled: true})}
            />
            <PrecisionSlider
              label="Noise Gate Floor"
              icon={ShieldAlert}
              value={audioNR.noiseGateThreshold}
              min={-72}
              max={-18}
              step={1}
              defaultValue={-44}
              unit=" dB"
              onChange={(v) => onUpdateAudioNR({noiseGateThreshold: v, enabled: true})}
            />
            <PrecisionSlider
              label="Rumble High-Pass"
              icon={Activity}
              value={audioNR.highPassHz}
              min={40}
              max={260}
              step={5}
              defaultValue={110}
              unit=" Hz"
              onChange={(v) => onUpdateAudioNR({highPassHz: v, enabled: true})}
            />
            <PrecisionSlider
              label="De-Hiss Low-Pass"
              icon={Waves}
              value={audioNR.lowPassHz}
              min={4000}
              max={18000}
              step={500}
              defaultValue={12000}
              unit=" Hz"
              onChange={(v) => onUpdateAudioNR({lowPassHz: v, enabled: true})}
            />
            <PrecisionSlider
              label="Voice Clarity Presence"
              icon={Mic}
              value={audioNR.voicePresence}
              min={0}
              max={100}
              step={1}
              defaultValue={35}
              unit="%"
              onChange={(v) => onUpdateAudioNR({voicePresence: v, enabled: true})}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs text-neutral-400">AC Hum Notch</span>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#141414] border border-white/10">
              {([0, 50, 60] as const).map((hz) => (
                <button
                  key={hz}
                  type="button"
                  onClick={() => onUpdateAudioNR({humNotchHz: hz, enabled: true})}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono-num cursor-pointer transition-colors ${
                    audioNR.humNotchHz === hz
                      ? 'bg-white text-black font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {hz === 0 ? 'Off' : `${hz}Hz`}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunDenoise}
            disabled={isProcessing || !targetAudioSrc}
            className="w-full min-h-[42px] rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 disabled:opacity-35 transition-colors cursor-pointer"
          >
            <Wand2 className="w-4 h-4" />
            <span>{isProcessing ? 'Denoising Audio...' : 'Apply Offline Voice Denoise'}</span>
          </button>

          {afterPeaks.length > 0 && (
            <div className="p-3 rounded-xl bg-[#0e0e0e] border border-white/12 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="inline-flex items-center gap-1.5 text-white font-medium">
                  <AudioLines className="w-3.5 h-3.5" />
                  <span>Before vs Cleaned Waveform</span>
                </span>
              </div>
              <div className="h-14 flex items-end gap-[2px] px-1">
                {afterPeaks.map((pk, idx) => {
                  const bef = beforePeaks[idx] ?? pk;
                  return (
                    <div key={idx} className="flex-1 h-full flex items-end relative">
                      <div
                        className="w-full bg-white/20 rounded-t-sm absolute bottom-0"
                        style={{height: `${Math.max(4, bef * 100)}%`}}
                      />
                      <div
                        className="w-full bg-white rounded-t-sm relative z-10"
                        style={{height: `${Math.max(3, pk * 100)}%`}}
                      />
                    </div>
                  );
                })}
              </div>
              {cleanedUrl && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => playAudition(cleanedUrl)}
                    className="min-h-[36px] rounded-lg bg-[#1c1c1c] border border-white/15 text-xs font-medium text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Play</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDenoisedToLibrary}
                    className="min-h-[36px] rounded-lg bg-[#1c1c1c] border border-white/15 text-xs font-medium text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Library</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadWav}
                    className="min-h-[36px] rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>WAV</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXTRACT AUDIO FROM VIDEO */}
      {subTab === 'extract' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#111111] border border-white/12 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-white">Extract Audio from Video</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                Convert any video file into a clean offline WAV audio track and save it straight
                into My Audio Library.
              </p>
            </div>

            <input
              ref={extractVideoInputRef}
              type="file"
              accept="video/*"
              onChange={handleExtractFromLocalVideoFile}
              className="hidden"
            />

            <button
              type="button"
              disabled={isExtracting}
              onClick={() => extractVideoInputRef.current?.click()}
              className="w-full min-h-[42px] rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>
                {isExtracting ? 'Extracting Audio...' : 'Choose Video from Device to Extract'}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-300">
                Imported Timeline Videos ({videoClips.length})
              </span>
            </div>

            {videoClips.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#0e0e0e] border border-white/10 text-xs text-neutral-400 leading-relaxed">
                No video clips are on the timeline yet. Use the button above to pick a video from
                your device, or tap the + button on the timeline to import a video clip.
              </div>
            ) : (
              <div className="space-y-2">
                {videoClips.map((vc) => (
                  <div
                    key={vc.id}
                    className="p-3 rounded-xl bg-[#101010] border border-white/12 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{vc.name}</span>
                      </div>
                      <div className="text-[10px] font-mono-num text-neutral-500 mt-0.5">
                        {formatDuration(vc.sourceDuration)} · {vc.width}×{vc.height}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isExtracting}
                      onClick={() => handleExtractFromVideo(vc.src, vc.name)}
                      className="min-h-[34px] px-3 rounded-lg bg-white text-black text-[11px] font-semibold hover:bg-neutral-200 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Extract Audio
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MY AUDIO LIBRARY GALLERY */}
      {subTab === 'library' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-neutral-300">
              My Audio Library · {audioLibrary.length} saved
            </span>
            <input
              ref={libraryAudioInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => handleUploadAudio(e, true)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => libraryAudioInputRef.current?.click()}
              className="inline-flex items-center gap-1 min-h-[34px] px-2.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import Audio</span>
            </button>
          </div>

          {audioLibrary.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#0f0f0f] border border-white/10 text-center space-y-3">
              <FileAudio className="w-7 h-7 text-neutral-400 mx-auto" />
              <p className="text-xs text-neutral-400 leading-relaxed">
                Your offline Audio Library is empty. Extract audio from any video, record voice, or
                import audio files to save and reuse them across projects.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubTab('extract')}
                  className="min-h-[36px] px-3 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 cursor-pointer"
                >
                  Extract from Video
                </button>
                <button
                  type="button"
                  onClick={() => libraryAudioInputRef.current?.click()}
                  className="min-h-[36px] px-3 rounded-lg bg-[#191919] border border-white/15 text-xs text-white hover:bg-white hover:text-black cursor-pointer"
                >
                  Import File
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[390px] overflow-y-auto studio-scroll pr-1">
              {audioLibrary.map((item) => {
                const isPlayingThis = playingLibraryId === item.id;
                const isApplied = audioNR.trackName === item.name || audioNR.trackSrc === item.objectUrl;
                const isEditingThis = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-colors space-y-2 ${
                      isApplied
                        ? 'bg-[#171717] border-white/50'
                        : 'bg-[#0f0f0f] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          playAudition(item.objectUrl || URL.createObjectURL(item.blob), item.id)
                        }
                        className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
                        aria-label={isPlayingThis ? `Pause ${item.name}` : `Play ${item.name}`}
                      >
                        {isPlayingThis ? (
                          <Pause className="w-4 h-4 fill-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editingName.trim()) {
                                  onRenameAudioInLibrary(item.id, editingName.trim());
                                  setEditingId(null);
                                }
                              }}
                              className="w-full h-7 px-2 rounded bg-black border border-white/30 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editingName.trim()) {
                                  onRenameAudioInLibrary(item.id, editingName.trim());
                                }
                                setEditingId(null);
                              }}
                              className="w-7 h-7 rounded bg-white text-black flex items-center justify-center cursor-pointer shrink-0"
                              aria-label="Save track name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-white truncate">
                            {item.name}
                          </div>
                        )}
                        <div className="text-[10px] text-neutral-400 font-mono-num flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize">{item.sourceType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatDuration(item.duration)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatBytes(item.sizeBytes)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mini Waveform Strip */}
                    {item.peaks.length > 0 && (
                      <div className="h-7 flex items-end gap-[2px] px-1">
                        {item.peaks.slice(0, 40).map((pk, pi) => (
                          <div
                            key={pi}
                            className={`flex-1 rounded-t-xs ${
                              isPlayingThis ? 'bg-white' : 'bg-white/35'
                            }`}
                            style={{height: `${Math.max(12, pk * 100)}%`}}
                          />
                        ))}
                      </div>
                    )}

                    {/* Library Track Actions */}
                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleUseLibraryTrack(item)}
                        className={`flex-1 min-h-[32px] rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          isApplied
                            ? 'bg-white text-black'
                            : 'bg-[#1c1c1c] text-white border border-white/15 hover:bg-white hover:text-black'
                        }`}
                      >
                        {isApplied ? 'Active in Project' : 'Use in Project'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name);
                        }}
                        className="w-8 h-8 rounded-lg bg-[#161616] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer"
                        title="Rename audio"
                        aria-label={`Rename ${item.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadLibraryItem(item)}
                        className="w-8 h-8 rounded-lg bg-[#161616] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer"
                        title="Download audio file"
                        aria-label={`Download ${item.name}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (playingLibraryId === item.id) {
                            previewAudioRef.current?.pause();
                            setPlayingLibraryId(null);
                          }
                          onDeleteAudioFromLibrary(item.id);
                        }}
                        className="w-8 h-8 rounded-lg bg-[#161616] border border-white/10 text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer"
                        title="Delete from library"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {statusMsg && (
        <p className="text-[11px] text-neutral-300 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 leading-relaxed">
          {statusMsg}
        </p>
      )}

      <audio ref={previewAudioRef} className="hidden" />
    </div>
  );
};
