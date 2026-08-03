import React, { useState, useRef } from 'react';
import { Settings, Mic, Upload, Music, Play, Pause, Volume2, VolumeX, ChevronUp, Shuffle, Box, Compass, Activity, Zap, Video, Camera, FileDown, Disc, Wand2 } from 'lucide-react';
import { JULIA_PRESETS } from '../constants';
import { AudioMode } from '../hooks/useAudioAnalyzer';
import { AudioMetrics } from './Visualizer';

interface ControlsProps {
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
  sensitivity: number;
  setSensitivity: (v: number) => void;
  geometryMode: number;
  setGeometryMode: (v: number) => void;
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
}

const formatTime = (secs: number) => {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const Controls: React.FC<ControlsProps> = ({
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
  geometryMode,
  setGeometryMode,
  fxMode,
  setFxMode,
  kaleidoscopeFolds,
  setKaleidoscopeFolds,
  rotSpeed,
  setRotSpeed,
  glowIntensity,
  setGlowIntensity,
  randomize,
  audioMetrics,

  isRecording,
  recordingSeconds,
  hasSessionKeyframes,
  startRecording,
  stopRecording,
  takeSnapshot,
  exportSessionJson,
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
    { id: 1, label: 'Cyber Laser Grid' },
    { id: 2, label: 'Chromatic Glitch' },
    { id: 3, label: 'Particle Dust' },
  ];

  const KALEIDOSCOPE_FOLDS = [
    { folds: 0, label: 'Off' },
    { folds: 4, label: '4-Fold' },
    { folds: 6, label: '6-Fold' },
    { folds: 8, label: '8-Fold' },
    { folds: 12, label: '12-Fold' },
    { folds: 16, label: '16-Fold' },
  ];

  const kickIntensity = audioMetrics?.kickIntensity || 0;
  const snareIntensity = audioMetrics?.snareIntensity || 0;

  return (
    <div className="fixed top-4 right-4 z-10 flex flex-col items-end gap-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black/60 backdrop-blur-md p-2.5 rounded-full text-white hover:bg-white/10 transition-colors border border-white/15 shadow-xl flex items-center gap-2"
      >
        {isRecording && (
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
        )}
        {isOpen ? <ChevronUp size={20} /> : <Settings size={20} />}
      </button>

      {isOpen && (
        <div className="bg-black/80 backdrop-blur-2xl p-6 rounded-2xl border border-white/15 w-84 sm:w-96 shadow-2xl text-white/90 max-h-[85vh] overflow-y-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-sm font-mono font-bold tracking-widest uppercase text-white/90">VISUALIZER ENGINE</h2>
              <span className="text-[10px] font-mono text-lime-400">3D Ink Flow & Sacred Geometry</span>
            </div>
            <button
              onClick={randomize}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              title="Randomize Parameters"
            >
              <Shuffle size={16} />
            </button>
          </div>

          {/* RECORDING & CAPTURE SUITE */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-red-950/40 via-zinc-900/60 to-black border border-red-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video size={15} className="text-red-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">RECORD & CAPTURE</span>
              </div>
              {isRecording && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[10px] font-mono text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>REC ({formatTime(recordingSeconds)})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="py-2.5 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-mono text-xs font-bold tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Disc size={15} className="animate-spin-slow" />
                  <span>Record Video</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="py-2.5 px-3 rounded-lg bg-zinc-900 border border-red-500/60 text-red-400 hover:bg-red-500/20 font-mono text-xs font-bold tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 animate-pulse"
                >
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                  <span>Stop ({formatTime(recordingSeconds)})</span>
                </button>
              )}

              <button
                onClick={takeSnapshot}
                className="py-2.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                <Camera size={15} />
                <span>PNG Snapshot</span>
              </button>
            </div>

            {hasSessionKeyframes && (
              <button
                onClick={exportSessionJson}
                className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-mono text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <FileDown size={13} />
                <span>Export Session Automation (.json)</span>
              </button>
            )}
          </div>

          {/* Audio Input Selector */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-widest text-white/50">Audio Input Source</div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={() => switchMode('demo')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-mono transition-all ${
                  audioMode === 'demo'
                    ? 'bg-lime-400 text-black font-bold shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Music size={14} />
                <span>Demo</span>
              </button>
              
              <button
                onClick={() => switchMode('file')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-mono transition-all ${
                  audioMode === 'file'
                    ? 'bg-lime-400 text-black font-bold shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Upload size={14} />
                <span>File</span>
              </button>

              <button
                onClick={() => switchMode('mic')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-mono transition-all ${
                  audioMode === 'mic'
                    ? 'bg-lime-400 text-black font-bold shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Mic size={14} />
                <span>Mic</span>
              </button>
            </div>
          </div>

          {/* Active Audio Player Card & Real-Time Beat HUD */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-lime-400 block">Active Track</span>
                <span className="text-xs font-medium text-white truncate block">{fileName}</span>
              </div>
              <button
                onClick={togglePlayPause}
                className="p-2.5 rounded-full bg-lime-400 text-black hover:bg-lime-300 transition-transform active:scale-95 shadow-md flex-shrink-0"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={15} fill="black" /> : <Play size={15} fill="black" className="ml-0.5" />}
              </button>
            </div>

            {/* REAL-TIME BEAT TRANSIENT HUD LAMPS */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div 
                className="py-1.5 px-2 rounded-lg border text-center transition-all duration-100 flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: kickIntensity > 0.15 ? `rgba(163, 230, 53, ${0.15 + kickIntensity * 0.45})` : 'rgba(255, 255, 255, 0.03)',
                  borderColor: kickIntensity > 0.15 ? 'rgba(163, 230, 53, 0.8)' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: kickIntensity > 0.15 ? `0 0 ${kickIntensity * 20}px rgba(163, 230, 53, 0.6)` : 'none'
                }}
              >
                <Zap size={12} className={kickIntensity > 0.15 ? 'text-lime-400 animate-pulse' : 'text-white/30'} />
                <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${kickIntensity > 0.15 ? 'text-lime-400' : 'text-white/40'}`}>
                  KICK / PLOSIVE
                </span>
              </div>

              <div 
                className="py-1.5 px-2 rounded-lg border text-center transition-all duration-100 flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: snareIntensity > 0.15 ? `rgba(56, 189, 248, ${0.15 + snareIntensity * 0.45})` : 'rgba(255, 255, 255, 0.03)',
                  borderColor: snareIntensity > 0.15 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: snareIntensity > 0.15 ? `0 0 ${snareIntensity * 20}px rgba(56, 189, 248, 0.6)` : 'none'
                }}
              >
                <Activity size={12} className={snareIntensity > 0.15 ? 'text-sky-400 animate-pulse' : 'text-white/30'} />
                <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${snareIntensity > 0.15 ? 'text-sky-400' : 'text-white/40'}`}>
                  SNARE / ATTACK
                </span>
              </div>
            </div>

            {/* REAL-TIME 7-BAND FFT SPECTRUM VISUALIZER */}
            {audioMetrics && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[9px] font-mono uppercase tracking-wider text-white/40">
                  <span>Sub</span>
                  <span>Kick</span>
                  <span>Mid</span>
                  <span>Snare</span>
                  <span>Pres</span>
                  <span>Treb</span>
                  <span>Air</span>
                </div>
                <div className="flex items-end gap-1 h-8 bg-black/40 p-1 rounded-md border border-white/10">
                  {[
                    audioMetrics.sub,
                    audioMetrics.kick,
                    audioMetrics.lowMid,
                    audioMetrics.snare,
                    audioMetrics.presence,
                    audioMetrics.treble,
                    audioMetrics.air,
                  ].map((val, idx) => (
                    <div key={idx} className="flex-1 bg-white/10 rounded-sm h-full flex items-end overflow-hidden">
                      <div 
                        className="w-full transition-all duration-75 rounded-sm"
                        style={{
                          height: `${Math.min(100, Math.max(5, val * 100))}%`,
                          backgroundColor: idx < 2 ? '#a3e635' : idx < 4 ? '#38bdf8' : '#c084fc'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* GEOMETRY & FRACTAL OBJECTS SELECTOR */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-white/60">
              <Box size={13} className="text-lime-400" />
              <span>Geometry & Fractal Mode</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {GEOMETRY_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setGeometryMode(mode.id)}
                  className={`py-2 px-2 text-[11px] font-mono rounded-lg transition-all text-center leading-snug ${
                    geometryMode === mode.id
                      ? 'bg-lime-400 text-black font-bold shadow-md'
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
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-white/60">
              <Wand2 size={13} className="text-lime-400" />
              <span>Visual FX Layer Overlay</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {FX_MODES.map((fx) => (
                <button
                  key={fx.id}
                  onClick={() => setFxMode(fx.id)}
                  className={`py-2 px-2 text-[11px] font-mono rounded-lg transition-all text-center ${
                    fxMode === fx.id
                      ? 'bg-sky-400 text-black font-bold shadow-md'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {fx.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kaleidoscope Fold Selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-white/60">
              <Compass size={13} className="text-lime-400" />
              <span>Polar Kaleidoscope Symmetry</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {KALEIDOSCOPE_FOLDS.map((f) => (
                <button
                  key={f.folds}
                  onClick={() => setKaleidoscopeFolds(f.folds)}
                  className={`py-1.5 text-[10px] font-mono rounded-md transition-all text-center ${
                    kaleidoscopeFolds === f.folds
                      ? 'bg-purple-400 text-black font-bold'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Julia Constant Presets */}
          {(geometryMode === 0 || geometryMode === 2) && (
            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="text-xs font-mono uppercase tracking-wider text-white/60">Julia Constant Presets</div>
              <div className="grid grid-cols-2 gap-1.5">
                {JULIA_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setJuliaC({ x: preset.x, y: preset.y })}
                    className={`px-2.5 py-1.5 text-xs font-mono rounded-lg transition-all text-left ${
                      Math.abs(juliaC.x - preset.x) < 0.001 && Math.abs(juliaC.y - preset.y) < 0.001
                        ? 'bg-lime-400 text-black font-bold shadow-sm'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls Sliders */}
          <div className="space-y-4 pt-1 border-t border-white/10">
            
            {/* Camera Orbit Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-white/60">
                <label>3D Camera Orbit Speed</label>
                <span className="text-lime-400">{rotSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="4.0"
                step="0.1"
                value={rotSpeed}
                onChange={(e) => setRotSpeed(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-lime-400"
              />
            </div>

            {/* Volumetric Glow */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-white/60">
                <label>Glow & Specular Intensity</label>
                <span>{glowIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={glowIntensity}
                onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Audio Sensitivity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-white/60">
                <label>Audio Reactivity Boost</label>
                <span className="text-lime-400 font-bold">{sensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="8.0"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-lime-400"
              />
            </div>

            {/* Zoom */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-white/60">
                <label>Camera Depth (Zoom)</label>
                <span>{zoom.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Iterations */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-white/60">
                <label>Complexity / Steps</label>
                <span>{iterations}</span>
              </div>
              <input
                type="range"
                min="16"
                max="96"
                step="2"
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Color Base */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wider text-white/60">
                <label>Color Palette Shift</label>
                <span>{colorBase.h.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.01"
                value={colorBase.h}
                onChange={(e) => setColorBase({ ...colorBase, h: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
