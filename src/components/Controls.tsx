import React, { useState, useRef, useEffect } from 'react';
import { Settings, Mic, Upload, Music, Play, Pause, ChevronUp, Shuffle, Compass, Activity, Zap, Video, Camera, FileDown, Disc, Type, HelpCircle, Gauge, Maximize, Minimize } from 'lucide-react';
import { JULIA_PRESETS } from '../constants';
import { AudioMode } from '../hooks/useAudioAnalyzer';
import { AudioMetrics, subscribeAudioMetrics } from './Visualizer';
import { BannerConfig, FONT_OPTIONS } from './ArtistBanner';

interface ControlsProps {
  isFullscreen?: boolean;
  toggleFullscreen?: () => void;
  audioMode: AudioMode;
  switchMode: (mode: AudioMode) => void;
  isPlaying: boolean;
  togglePlayPause: () => void;
  currentTime: number;
  duration: number;
  volume: number;
  setVolume: (v: number) => void;
  fileName: string;
  loadAudioFile: (file: File) => void;
  seek: (seconds: number) => void;
  zoom: number;
  setZoom: (v: number) => void;
  iterations: number;
  setIterations: (v: number) => void;
  colorBase: { h: number; s: number; l: number };
  setColorBase: (v: { h: number; s: number; l: number }) => void;
  juliaC: { x: number; y: number };
  setJuliaC: (v: { x: number; y: number }) => void;
  response: number;
  setResponse: (value: number) => void;
  sensitivity: number;
  setSensitivity: (v: number) => void;
  geometryMode: number;
  setGeometryMode: (v: number) => void;
  fxMix: number;
  setFxMix: (value: number) => void;
  fxMode: number;
  setFxMode: (v: number) => void;
  kaleidoscopeFolds: number;
  setKaleidoscopeFolds: (v: number) => void;
  rotSpeed: number;
  setRotSpeed: (v: number) => void;
  glowIntensity: number;
  setGlowIntensity: (v: number) => void;
  randomize: () => void;
  audioMetrics?: AudioMetrics | null;

  isRecording: boolean;
  recordingSeconds: number;
  hasSessionKeyframes: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  takeSnapshot: () => void;
  exportSessionJson: () => void;

  bannerConfig: BannerConfig;
  setBannerConfig: React.Dispatch<React.SetStateAction<BannerConfig>>;
}

const formatTime = (secs: number) => {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

// Isolated Real-Time 18-Channel Psychoacoustic HUD Component
const AudioSpectrumHUD: React.FC = React.memo(() => {
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null);

  useEffect(() => {
    return subscribeAudioMetrics((newMetrics) => {
      setMetrics(newMetrics);
    });
  }, []);

  const kickIntensity = metrics?.kickIntensity || 0;
  const snareIntensity = metrics?.snareIntensity || 0;
  const bands = metrics?.bands || [];
  const centroid = metrics?.spectralCentroid || 0.3;
  const flatness = metrics?.spectralFlatness || 0.2;

  // 18-band visual control labels for HUD hover tooltip
  const BAND_VISUAL_LABELS = [
    'B0 Sub1: Lens Shockwave',
    'B1 Sub2: Core Volume',
    'B2 Kick1: Camera Recoil',
    'B3 Kick2: Shockwave Ripple',
    'B4 Bass: Warp Viscosity',
    'B5 Bass: Tendril Braid',
    'B6 Mid: Chladni Mode',
    'B7 Mid: Azimuth Rotation',
    'B8 Snare: Tunnel Aperture',
    'B9 Vocal: Mandala Ring',
    'B10 Vocal: Palette Drift',
    'B11 Snap: Spectral Echo',
    'B12 Pres: Crystal Ridge',
    'B13 Pres: Mist Emission',
    'B14 Treb: Fresnel Sheen',
    'B15 Treb: Specular Spark',
    'B16 Air: Starlight Scatter',
    'B17 Air: Surface Ripple',
  ];


  return (
    <>
      {/* REAL-TIME BEAT TRANSIENT HUD LAMPS */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div 
          className="py-1.5 px-2 rounded-md border text-center transition-all duration-100 flex items-center justify-center gap-1.5"
          style={{
            backgroundColor: kickIntensity > 0.15 ? `rgba(137, 188, 255, ${0.05 + kickIntensity * 0.22})` : 'rgba(255, 255, 255, 0.03)',
            borderColor: kickIntensity > 0.15 ? 'rgba(137, 188, 255, 0.8)' : 'rgba(255, 255, 255, 0.1)',

          }}
        >
          <Zap size={12} className={kickIntensity > 0.15 ? 'text-neutral-300 ' : 'text-white/30'} />
          <span className={`text-xs  font-bold   ${kickIntensity > 0.15 ? 'text-neutral-300' : 'text-neutral-400'}`}>
            Kick
          </span>
        </div>

        <div 
          className="py-1.5 px-2 rounded-md border text-center transition-all duration-100 flex items-center justify-center gap-1.5"
          style={{
            backgroundColor: snareIntensity > 0.15 ? `rgba(137, 188, 255, ${0.05 + snareIntensity * 0.22})` : 'rgba(255, 255, 255, 0.03)',
            borderColor: snareIntensity > 0.15 ? 'rgba(137, 188, 255, 0.8)' : 'rgba(255, 255, 255, 0.1)',

          }}
        >
          <Activity size={12} className={snareIntensity > 0.15 ? 'text-neutral-300 ' : 'text-white/30'} />
          <span className={`text-xs  font-bold   ${snareIntensity > 0.15 ? 'text-neutral-300' : 'text-neutral-400'}`}>
            Snare
          </span>
        </div>
      </div>

      {/* 18-BAND PSYCHOACOUSTIC EQUALIZER HUD */}
      {bands.length > 0 && (
        <div className="space-y-1.5 pt-1.5 border-t border-white/10">
          <div className="flex justify-between items-center text-xs text-neutral-400">
            <span className="text-neutral-300 font-bold">Spectrum</span>
            <span className="text-xs text-neutral-400">20 Hz to 20 kHz</span>
          </div>

        <div className="flex items-end gap-0.5 h-10 bg-black/60 p-1 rounded-md border border-white/10">
            {bands.map((val, idx) => (
              <div
                key={idx}
                className="flex-1 bg-white/5 rounded-xs h-full flex items-end overflow-hidden relative group cursor-pointer"
                title={BAND_VISUAL_LABELS[idx]}
              >
                <div 
                  className="w-full transition-all duration-75 rounded-xs"
                  style={{
                    height: `${Math.min(100, Math.max(6, val * 100))}%`,
                    backgroundColor: 'var(--studio-accent)',

                  }}
                />
                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                  <div className="bg-black/95 border border-white/20 rounded px-1.5 py-1 text-xs text-white/90 whitespace-nowrap">
                    {BAND_VISUAL_LABELS[idx]}
                  </div>
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white/20" />
                </div>
              </div>
            ))}
          </div>

          {/* TIMBRAL DESCRIPTORS (CENTROID & FLATNESS) */}
          <div className="grid grid-cols-2 gap-2 pt-0.5 text-xs">
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/5 border border-white/5 min-w-0 overflow-hidden">
              <span className="text-neutral-400 truncate mr-1" title="Filter Brightness (Centroid)">Filter:</span>
              <span className="text-neutral-300 font-bold tabular-nums w-10 text-right shrink-0">
                {(centroid * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded bg-white/5 border border-white/5 min-w-0 overflow-hidden">
              <span className="text-neutral-400 truncate mr-1" title="Tonality / Spectral Flatness">Tonality:</span>
              <span className="text-neutral-300 font-bold w-14 text-right shrink-0 truncate">
                {flatness < 0.3 ? 'Tonal' : flatness < 0.6 ? 'Balanced' : 'Noise'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export const Controls: React.FC<ControlsProps> = React.memo(({
  audioMode,
  switchMode,
  isPlaying,
  togglePlayPause,
  currentTime,
  duration,
  volume,
  setVolume,
  fileName,
  loadAudioFile,
  seek,
  zoom,
  setZoom,
  iterations,
  setIterations,
  colorBase,
  setColorBase,
  juliaC,
  setJuliaC,
  sensitivity,
  setSensitivity,
  response,
  setResponse,
  geometryMode,
  setGeometryMode,
  fxMode,
  setFxMode,
  fxMix,
  setFxMix,
  kaleidoscopeFolds,
  setKaleidoscopeFolds,
  rotSpeed,
  setRotSpeed,
  glowIntensity,
  setGlowIntensity,
  randomize,

  isRecording,
  recordingSeconds,
  hasSessionKeyframes,
  startRecording,
  stopRecording,
  takeSnapshot,
  exportSessionJson,

  bannerConfig,
  setBannerConfig,
  isFullscreen,
  toggleFullscreen,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadAudioFile(e.target.files[0]);
    }
  };

  const GEOMETRY_MODES = [
    { id: 0, label: 'Classic 2D Liquid' },
    { id: 1, label: '3D Mandelbulb' },
    { id: 2, label: '3D Julia' },
    { id: 3, label: '3D Ink Flow' },
    { id: 4, label: 'Sri Yantra Mandala' },
    { id: 5, label: "Metatron's Cube" },
    { id: 6, label: '3D Torus Knot' },
    { id: 7, label: 'Prism Pyramid' },
    { id: 8, label: 'Cosmic Tunnel' },
  ];

  const FX_MODES = [
    { id: 0, label: 'Off' },
    { id: 1, label: 'Pulse Grid' },
    { id: 2, label: 'Spectral Echo' },
    { id: 3, label: 'Particle Field' },
  ];

  const KALEIDOSCOPE_FOLDS = [
    { folds: 0, label: 'Off' },
    { folds: 4, label: '4-Fold' },
    { folds: 6, label: '6-Fold' },
    { folds: 8, label: '8-Fold' },
    { folds: 12, label: '12-Fold' },
    { folds: 16, label: '16-Fold' },
  ];

  return (
    <div className="fixed top-4 right-4 z-10 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {toggleFullscreen && (
          <button
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-md transition-all border  flex items-center justify-center ${
              isFullscreen
                ? 'studio-selected hover:bg-neutral-700 '
                : 'bg-black/60 backdrop-blur-md text-white hover:bg-white/10 border-white/15'
            }`}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-black/60 backdrop-blur-md p-2.5 rounded-md text-white hover:bg-white/10 transition-colors border border-white/15 flex items-center gap-2"
          title={isOpen ? "Collapse Controls" : "Open Controls"}
        >
          {isRecording && (
            <span className="w-2.5 h-2.5 rounded-full studio-record-dot" />
          )}
          {isOpen ? <ChevronUp size={20} /> : <Settings size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className="studio-surface studio-panel p-5 sm:p-6 text-white/90 overflow-y-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-sm font-bold text-white/90">Visualizer controls</h2>
            </div>
            <button
              onClick={randomize}
              className="p-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition-all"
              title="Randomize Parameters"
            >
              <Shuffle size={16} />
            </button>
          </div>

          {/* RECORDING & CAPTURE SUITE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video size={15} className="text-neutral-300" />
                <span className="text-xs font-bold text-white">Capture</span>
              </div>
              {isRecording && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-300/20 border border-neutral-300/40 text-xs text-neutral-300">
                  <span className="w-2 h-2 rounded-full studio-record-dot" />
                  <span>REC ({formatTime(recordingSeconds)})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="py-2.5 px-3 rounded-md studio-selected text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Disc size={15} />
                  <span>Record Video</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="py-2.5 px-3 rounded-md studio-recording bg-zinc-900 border border-neutral-300/60 text-neutral-300 hover:bg-neutral-600/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="w-2.5 h-2.5 rounded-sm studio-record-dot" />
                  <span>Stop ({formatTime(recordingSeconds)})</span>
                </button>
              )}

              <button
                onClick={takeSnapshot}
                className="py-2.5 px-3 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Camera size={15} />
                <span>PNG Snapshot</span>
              </button>
            </div>

            {hasSessionKeyframes && (
              <button
                onClick={exportSessionJson}
                className="w-full py-1.5 px-3 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs transition-all flex items-center justify-center gap-2"
              >
                <FileDown size={13} />
                <span>Export Session Automation (.json)</span>
              </button>
            )}
          </div>

          {/* ARTIST WATERMARK & TYPOGRAPHY OVERLAY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={15} className="text-neutral-300" />
                <span className="text-xs font-bold text-white">Artist watermark</span>
              </div>
              <button
                onClick={() => setBannerConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-2.5 py-0.5 rounded-full text-xs  font-bold   transition-all ${
                  bannerConfig.enabled
                    ? 'studio-selected '
                    : 'bg-white/10 text-neutral-400 hover:bg-white/20'
                }`}
              >
                {bannerConfig.enabled ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {bannerConfig.enabled && (
              <div className="space-y-2.5 pt-1 border-t border-white/10 text-xs">
                {/* Artist Name Input */}
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Artist / Project Name
                  </label>
                  <input
                    type="text"
                    value={bannerConfig.artistName}
                    onChange={(e) => setBannerConfig(prev => ({ ...prev, artistName: e.target.value }))}
                    placeholder="e.g. JUSTIN RAY"
                    className="w-full bg-black/60 border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-neutral-300 focus:outline-none"
                  />
                </div>

                {/* Subtitle / Track Title Input */}
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Subtitle / Track Title
                  </label>
                  <input
                    type="text"
                    value={bannerConfig.subtitle}
                    onChange={(e) => setBannerConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="e.g. LIVE AUDIOVISUAL PERFORMANCE"
                    className="w-full bg-black/60 border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-neutral-300 focus:outline-none"
                  />
                </div>

                {/* Typography Font Selector */}
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Typography Style ({FONT_OPTIONS.length} Fonts)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {FONT_OPTIONS.map((f) => {
                      const isSel = bannerConfig.font === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setBannerConfig(prev => ({ ...prev, font: f.id }))}
                          className={`px-2 py-1.5 rounded-md border text-left transition-all flex flex-col justify-center ${
                            isSel
                              ? 'studio-selected font-bold '
                              : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
                          }`}
                        >
                          <span className={`text-xs ${f.id} truncate leading-tight`}>{f.name}</span>
                          <span className={`text-xs   ${isSel ? 'text-white/70' : 'text-neutral-400'}`}>
                            {f.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Placement Selector */}
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Position on Screen
                  </label>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {[
                      { id: 'bottom-left', label: 'Lower-Left VJ' },
                      { id: 'center', label: 'Hero Center' },
                      { id: 'top-center', label: 'Top Marquee' },
                      { id: 'bottom-center', label: 'Docked Bottom' },
                    ].map((pos) => {
                      const isSel = bannerConfig.position === pos.id;
                      return (
                        <button
                          key={pos.id}
                          onClick={() => setBannerConfig(prev => ({ ...prev, position: pos.id as any }))}
                          className={`py-1 px-2 rounded-md border text-center transition-all ${
                            isSel
                              ? 'studio-selected font-bold'
                              : 'bg-white/5 hover:bg-white/10 text-white/60 border-white/10'
                          }`}
                        >
                          {pos.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Blend Mode */}
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">
                    Visual Effect & Blend
                  </label>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {[
                      { id: 'difference', label: 'Color Invert' },
                      { id: 'glass', label: 'Frosted Glass' },
                      { id: 'neon', label: 'Pure Neon' },
                    ].map((s) => {
                      const isSel = bannerConfig.style === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setBannerConfig(prev => ({ ...prev, style: s.id as any }))}
                          className={`py-1 px-1.5 rounded-md border text-center transition-all ${
                            isSel
                              ? 'studio-selected font-bold'
                              : 'bg-white/5 hover:bg-white/10 text-white/60 border-white/10'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audio Input Selector */}
          <div className="space-y-2">
            <div className="text-xs text-neutral-400">Audio Input Source</div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 rounded-md border border-white/10">
              <button
                onClick={() => switchMode('demo')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs  transition-all ${
                  audioMode === 'demo'
                    ? 'studio-selected font-bold '
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Music size={14} />
                <span>Demo</span>
              </button>
              
              <button
                onClick={() => switchMode('file')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs  transition-all ${
                  audioMode === 'file'
                    ? 'studio-selected font-bold '
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Upload size={14} />
                <span>File</span>
              </button>

              <button
                onClick={() => switchMode('mic')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs  transition-all ${
                  audioMode === 'mic'
                    ? 'studio-selected font-bold '
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Mic size={14} />
                <span>Mic</span>
              </button>
            </div>
          </div>

          {/* Active Audio Player Card & Real-Time Beat HUD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <span className="text-xs text-neutral-300 block">Active Track</span>
                <span className="text-xs font-medium text-white truncate block">{fileName}</span>
              </div>
              <button
                onClick={togglePlayPause}
                className="p-2.5 rounded-md studio-selected hover:bg-neutral-700 transition-transform active:scale-95 flex-shrink-0"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
              </button>
            </div>

            {/* ISOLATED SELF-SUBSCRIBED HUD */}
            <AudioSpectrumHUD />
          </div>

          {/* GEOMETRY & FRACTAL OBJECTS SELECTOR */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-white/60">

              <span>Geometry</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {GEOMETRY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setGeometryMode(mode.id)}
                  className={`py-2 px-2 text-xs  rounded-md transition-all text-center leading-snug ${
                    geometryMode === mode.id
                      ? 'studio-selected font-bold '
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* VISUAL FX OVERLAY SELECTOR */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-white/60">

              <span>Visual FX</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {FX_MODES.map((fx) => (
                <button
                  key={fx.id}
                  aria-pressed={fxMode === fx.id}
                  onClick={() => setFxMode(fx.id)}
                  className={`py-2 px-2 text-xs  rounded-md transition-all text-center ${
                    fxMode === fx.id
                      ? 'studio-selected font-bold '
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {fx.label}
                </button>
              ))}
            </div>
            {fxMode !== 0 && <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs text-white/70">
                <label htmlFor="fx-mix">FX Mix</label>
                <output htmlFor="fx-mix">{Math.round(fxMix * 100)}%</output>
              </div>
              <input id="fx-mix" type="range" min="0" max="1" step="0.01" value={fxMix}
                onChange={e => setFxMix(Number(e.target.value))} className="w-full accent-neutral-300" />
            </div>}
          </div>

          {/* Kaleidoscope Fold Selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-white/60">

              <span>Kaleidoscope</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {KALEIDOSCOPE_FOLDS.map((f) => (
                <button
                  key={f.folds}
                  onClick={() => setKaleidoscopeFolds(f.folds)}
                  className={`py-1.5 text-xs  rounded-md transition-all text-center ${
                    kaleidoscopeFolds === f.folds
                      ? 'studio-selected font-bold'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Julia Constant & Coordinates Controls */}
          {(geometryMode === 0 || geometryMode === 2) && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  <Activity size={13} className="text-neutral-300" />
                  <span>Julia Constant Coordinates</span>
                </div>
                <button
                  onClick={() => setJuliaC({ x: -0.8, y: 0.156 })}
                  className="text-xs text-neutral-300/70 hover:text-neutral-300 transition-colors"
                  title="Reset to Default (-0.8, 0.156)"
                >
                  Reset Default
                </button>
              </div>

              {/* Real and Imaginary Coordinate Sliders with Rich Hover Explainers */}
              <div className="space-y-3">
                
                {/* Real Component (X) Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-white/70">
                    <div 
                      className="flex items-center gap-1.5 group relative cursor-help"
                      title="Controls structural branching and filament connectivity. Left values create continuous solid rings and ribbons; right values fracture into intricate dendrites and island crystals."
                    >
                      <span className="font-semibold text-white/90">C Real (X)</span>
                      <HelpCircle size={13} className="text-neutral-300/80 group-hover:text-neutral-300 transition-colors" />
                      
                      {/* Rich Hover Explainer Tooltip */}
                      <div className="absolute left-0 top-6 hidden group-hover:block z-50 w-64 p-2.5 rounded-md bg-black/95 border border-neutral-300/50 text-xs normal-case text-white/90 backdrop-blur-xl pointer-events-none transition-all">
                        <div className="font-bold text-neutral-300 mb-0.5 text-xs flex items-center gap-1">
                          <Activity size={10} />
                          <span>Julia Constant: Real Axis (X)</span>
                        </div>
                        <p className="leading-relaxed text-white/80 font-sans">
                          Controls structural branching and filament connectivity. Left values create continuous solid rings and ribbons; right values fracture into intricate dendrites and island crystals.
                        </p>
                      </div>
                    </div>
                    <span className="text-neutral-300 font-bold tabular-nums">{juliaC.x.toFixed(3)}</span>
                  </div>
                  <span className="text-xs text-neutral-400 block leading-tight">
                    Structural branching & filament connectivity
                  </span>
                  <input
                    type="range"
                    min="-2.0"
                    max="2.0"
                    step="0.002"
                    value={juliaC.x}
                    onChange={(e) => setJuliaC({ ...juliaC, x: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/20 rounded-md appearance-none cursor-pointer accent-neutral-300"
                  />
                </div>

                {/* Imaginary Component (Y) Slider */}
                <div className="space-y-1.5 pt-1 border-t border-white/5">
                  <div className="flex justify-between items-center text-xs text-white/70">
                    <div 
                      className="flex items-center gap-1.5 group relative cursor-help"
                      title="Controls the rotational spiral vortex and curl direction. Sets clockwise vs. counter-clockwise swirling vorticity and adjusts how tightly the recursive arms pinch around center."
                    >
                      <span className="font-semibold text-white/90">C Imaginary (Y)</span>
                      <HelpCircle size={13} className="text-neutral-300/80 group-hover:text-neutral-300 transition-colors" />
                      
                      {/* Rich Hover Explainer Tooltip */}
                      <div className="absolute left-0 top-6 hidden group-hover:block z-50 w-64 p-2.5 rounded-md bg-black/95 border border-neutral-300/50 text-xs normal-case text-white/90 backdrop-blur-xl pointer-events-none transition-all">
                        <div className="font-bold text-neutral-300 mb-0.5 text-xs flex items-center gap-1">
                          <Compass size={10} />
                          <span>Julia Constant: Imaginary Axis (Y)</span>
                        </div>
                        <p className="leading-relaxed text-white/80 font-sans">
                          Controls the rotational spiral vortex and curl direction. Sets clockwise vs. counter-clockwise swirling vorticity and adjusts how tightly the recursive arms pinch around center.
                        </p>
                      </div>
                    </div>
                    <span className="text-neutral-300 font-bold tabular-nums">{juliaC.y.toFixed(3)}</span>
                  </div>
                  <span className="text-xs text-neutral-400 block leading-tight">
                    Rotational spiral vortex & arm curling
                  </span>
                  <input
                    type="range"
                    min="-2.0"
                    max="2.0"
                    step="0.002"
                    value={juliaC.y}
                    onChange={(e) => setJuliaC({ ...juliaC, y: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-white/20 rounded-md appearance-none cursor-pointer accent-neutral-300"
                  />
                </div>
              </div>

              {/* Julia Presets */}
              <div className="space-y-1.5">
                <div className="text-xs text-neutral-400">Mathematical Presets</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {JULIA_PRESETS.map((preset) => {
                    const isActive = Math.abs(juliaC.x - preset.x) < 0.015 && Math.abs(juliaC.y - preset.y) < 0.015;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => setJuliaC({ x: preset.x, y: preset.y })}
                        className={`px-2.5 py-1.5 text-xs  rounded-md transition-all text-left flex justify-between items-center ${
                          isActive
                            ? 'studio-selected font-bold '
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span>{preset.name}</span>
                        <span className={`text-xs ${isActive ? 'text-white/70' : 'text-neutral-400'}`}>
                          {preset.x > 0 ? `+${preset.x}` : preset.x}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Controls Sliders */}
          <div className="space-y-4 pt-1 border-t border-white/10">
            
            {/* Master Engine Motion & Orbit Speed Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-white/70">
                <label className="flex items-center gap-1.5">
                  <Gauge size={13} className="text-neutral-300" />
                  <span>Engine Motion & Orbit Speed</span>
                </label>
                <span className="text-neutral-300 font-bold tabular-nums">{rotSpeed.toFixed(2)}x</span>
              </div>
              <span className="text-xs text-neutral-400 block leading-tight">
                Sets the pace of the orbit and background drift
              </span>
              <input
                type="range"
                min="0.0"
                max="2.5"
                step="0.05"
                value={rotSpeed}
                onChange={(e) => setRotSpeed(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-md appearance-none cursor-pointer accent-neutral-300"
              />
              <div className="grid grid-cols-4 gap-1 pt-0.5">
                {[
                  { val: 0.0, label: '0x Still Orbit' },
                  { val: 0.4, label: '0.4x Ambient' },
                  { val: 0.8, label: '0.8x Club' },
                  { val: 1.25, label: '1.25x Dynamic' }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setRotSpeed(preset.val)}
                    className={`py-1 px-1 text-xs  rounded border transition-all ${
                      Math.abs(rotSpeed - preset.val) < 0.05
                        ? 'studio-selected font-bold '
                        : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Volumetric Glow (Constrained) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/60">
                <label>{geometryMode === 0 ? 'Luminance & Glow Depth' : 'Glow & Specular Intensity'}</label>
                <span className="tabular-nums">{glowIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.2"
                step="0.1"
                value={glowIntensity}
                onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-md appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Audio Sensitivity (Constrained within Screen Boundaries) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/60">
                <label>Sensitivity</label>
                <span className="text-neutral-300 font-bold tabular-nums">{sensitivity.toFixed(1)}x</span>
              </div>
              <span className="text-xs text-neutral-400 block leading-tight">
                Sets how far the geometry moves in response to sound
              </span>
              <input
                type="range"
                min="0.4"
                max="3.5"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-md appearance-none cursor-pointer accent-neutral-300"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/60">
                <label htmlFor="motion-response">Response</label>
                <span className="text-neutral-300">{response < 0.33 ? 'Tight' : response < 0.67 ? 'Balanced' : 'Fluid'}</span>
              </div>
              <input id="motion-response" type="range" min="0" max="1" step="0.01"
                value={response} onChange={event => setResponse(Number(event.target.value))}
                className="w-full h-1 bg-white/20 rounded-md appearance-none cursor-pointer accent-neutral-300" />
              <div className="flex justify-between text-xs text-white/55"><span>Quick rebound</span><span>Long release</span></div>
            </div>

            {/* Camera Depth (Zoom - Screen Boundary Constrained) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/60">
                <label>Camera Depth (Zoom)</label>
                <span className="tabular-nums">{zoom.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.2"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-md appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Iterations */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/60">
                <label>Complexity / Ray Steps</label>
                <span className="tabular-nums">{iterations}</span>
              </div>
              <input
                type="range"
                min="16"
                max="96"
                step="2"
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-md appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* CLUB EDM COLOR PALETTE SUITE */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="flex justify-between text-xs text-white/60">
                <label>Color palette</label>
                <span className="text-neutral-300 font-bold tabular-nums">{colorBase.h.toFixed(2)}</span>
              </div>

              {/* Quick Select Buttons for Dark Alternative Themes */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { name: 'Blood Crimson', h: 0.00, s: 0.90, l: 0.35, color: '#991b1b' },
                  { name: 'Abyssal Blue', h: 0.62, s: 0.90, l: 0.30, color: '#1e3a8a' },
                  { name: 'Cryo Violet', h: 0.78, s: 0.85, l: 0.30, color: '#6b21a8' },
                  { name: 'Monochrome Noir', h: 0.60, s: 0.05, l: 0.35, color: '#475569' },
                  { name: 'Smoked Teal', h: 0.50, s: 0.80, l: 0.25, color: '#164e63' },
                  { name: 'Cyber Cobalt', h: 0.60, s: 0.85, l: 0.40, color: '#1d4ed8' },
                ].map(theme => {
                  const isCurrent = Math.abs(colorBase.h - theme.h) < 0.04 && (theme.name !== 'Monochrome Noir' || colorBase.s < 0.2);
                  return (
                    <button
                      key={theme.name}
                      onClick={() => setColorBase({ h: theme.h, s: theme.s, l: theme.l })}
                      className={`px-2 py-1.5 rounded-md border text-left  text-xs flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'studio-selected font-bold '
                          : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }} />
                        <span>{theme.name}</span>
                      </div>
                      {isCurrent && <span className="text-xs text-neutral-300 font-bold">ON</span>}
                    </button>
                  );
                })}
              </div>

              {/* Fine Palette Shift Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Custom Drift Shift</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={colorBase.h}
                  onChange={(e) => setColorBase({ ...colorBase, h: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/20 rounded-md appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
});
