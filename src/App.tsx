import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Visualizer } from './components/Visualizer';
import { Controls } from './components/Controls';
import { BottomBar } from './components/BottomBar';
import { OnboardingModal } from './components/OnboardingModal';
import { ArtistBanner, BannerConfig } from './components/ArtistBanner';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { useMediaRecorder } from './hooks/useMediaRecorder';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fullscreen State and Keyboard Shortcut Management
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    }
  }, []);

  // Keyboard shortcut: Press 'F' to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleFullscreen]);

  // Artist Branding Overlay State
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>({
    enabled: false,
    artistName: 'JUSTIN RAY',
    subtitle: 'HYBRID PRODUCTION · 3D INK ENGINE',
    font: 'font-notable',
    position: 'bottom-left',
    style: 'difference',
  });

  const {
    audioMode,
    switchMode,
    isListening,
    isPlaying,
    currentTime,
    duration,
    volume,
    fileName,
    loadAudioFile,
    togglePlayPause,
    seek,
    setVolume,
    analyser,
    audioStream
  } = useAudioAnalyzer();

  // Media & Session Automation Recorder Hook (with Artist Watermark Compositing)
  const {
    isRecording,
    recordingSeconds,
    hasSessionKeyframes,
    startRecording: startMediaRecording,
    stopRecording,
    recordKeyframe,
    exportSessionJson,
    takeSnapshot,
    onRenderFrame
  } = useMediaRecorder(canvasRef, audioStream, bannerConfig);

  // 3D Fractal Engine State (Calm, Hypnotic Club EDM Defaults)
  const [zoom, setZoomState] = useState(1.05);
  const [offsetX, setOffsetX] = useState(0.0);
  const [offsetY, setOffsetY] = useState(0.0);
  const [iterations, setIterationsState] = useState(64);
  const [colorBase, setColorBaseState] = useState({ h: 0.60, s: 0.85, l: 0.40 }); // Cyber Cobalt
  const [juliaC, setJuliaCState] = useState({ x: -0.8, y: 0.156 });
  const [sensitivity, setSensitivityState] = useState(1.4); // Balanced, calm reactivity

  // 3D Raymarching & Geometry States
  const [geometryMode, setGeometryModeState] = useState(3); // Default: 3D Ink Flow
  const [fxMode, setFxModeState] = useState(1); // Default: Cyber Laser Grid
  const [kaleidoscopeFolds, setKaleidoscopeFoldsState] = useState(6); // Default: 6-fold
  const [rotSpeed, setRotSpeedState] = useState(0.80); // Confident, rhythmic club motion speed
  const [glowIntensity, setGlowIntensityState] = useState(1.2);

  // Parameter Change Wrappers for Recording Session Automation
  const setZoom = useCallback((v: number) => {
    setZoomState(v);
    recordKeyframe({ zoom: v });
  }, [recordKeyframe]);

  const setIterations = useCallback((v: number) => {
    setIterationsState(v);
    recordKeyframe({ iterations: v });
  }, [recordKeyframe]);

  const setColorBase = useCallback((v: { h: number; s: number; l: number }) => {
    setColorBaseState(v);
    recordKeyframe({ colorBase: v });
  }, [recordKeyframe]);

  const setJuliaC = useCallback((v: { x: number; y: number }) => {
    setJuliaCState(v);
    recordKeyframe({ juliaC: v });
  }, [recordKeyframe]);

  const setSensitivity = useCallback((v: number) => {
    setSensitivityState(v);
    recordKeyframe({ sensitivity: v });
  }, [recordKeyframe]);

  const setGeometryMode = useCallback((v: number) => {
    setGeometryModeState(v);
    recordKeyframe({ geometryMode: v });
  }, [recordKeyframe]);

  const setFxMode = useCallback((v: number) => {
    setFxModeState(v);
    recordKeyframe({ fxMode: v });
  }, [recordKeyframe]);

  const setKaleidoscopeFolds = useCallback((v: number) => {
    setKaleidoscopeFoldsState(v);
    recordKeyframe({ kaleidoscopeFolds: v });
  }, [recordKeyframe]);

  const setRotSpeed = useCallback((v: number) => {
    setRotSpeedState(v);
    recordKeyframe({ rotSpeed: v });
  }, [recordKeyframe]);

  const setGlowIntensity = useCallback((v: number) => {
    setGlowIntensityState(v);
    recordKeyframe({ glowIntensity: v });
  }, [recordKeyframe]);

  const startRecording = useCallback(() => {
    startMediaRecording({
      geometryMode,
      fxMode,
      kaleidoscopeFolds,
      zoom,
      rotSpeed,
      glowIntensity,
      colorBase,
      juliaC
    });
  }, [startMediaRecording, geometryMode, fxMode, kaleidoscopeFolds, zoom, rotSpeed, glowIntensity, colorBase, juliaC]);

  const randomize = useCallback(() => {
    const newJulia = { x: (Math.random() * 3.2 - 1.6), y: (Math.random() * 3.2 - 1.6) };
    const clubHues = [0.60, 0.78, 0.46, 0.55, 0.82];
    const newHue = clubHues[Math.floor(Math.random() * clubHues.length)];
    const newColor = { h: newHue, s: 0.85, l: 0.40 };
    const newZoom = 0.85 + Math.random() * 0.5; // Well-bounded between 0.85 and 1.35
    const newMode = Math.floor(Math.random() * 9);
    const newFx = Math.floor(Math.random() * 4);
    const foldsOptions = [0, 4, 6, 8, 12, 16];
    const newFolds = foldsOptions[Math.floor(Math.random() * foldsOptions.length)];

    setJuliaCState(newJulia);
    setColorBaseState(newColor);
    setZoomState(newZoom);
    setGeometryModeState(newMode);
    setFxModeState(newFx);
    setKaleidoscopeFoldsState(newFolds);

    recordKeyframe({
      juliaC: newJulia,
      colorBase: newColor,
      zoom: newZoom,
      geometryMode: newMode,
      fxMode: newFx,
      kaleidoscopeFolds: newFolds
    });
  }, [recordKeyframe]);

  return (
    <div className="relative w-full h-screen overflow-hidden text-white font-sans">
      <Visualizer
        canvasRef={canvasRef}
        analyser={analyser}
        zoom={zoom}
        offsetX={offsetX}
        offsetY={offsetY}
        iterations={iterations}
        colorBase={colorBase}
        juliaC={juliaC}
        sensitivity={sensitivity}
        geometryMode={geometryMode}
        fxMode={fxMode}
        kaleidoscopeFolds={kaleidoscopeFolds}
        rotSpeed={rotSpeed}
        glowIntensity={glowIntensity}
        onRenderFrame={onRenderFrame}
      />
      
      {/* Top Header Logo (Restored Optical Translucent Color Inversion) */}
      <div className="absolute top-6 left-8 mix-blend-difference z-10 select-none">
        <a 
          href="https://trustnodelogic.com" 
          target="_blank" 
          rel="noopener noreferrer"
          title="Trust Node Logic — https://trustnodelogic.com"
          className="group flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity cursor-pointer text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-disc animate-spin-slow opacity-85 group-hover:opacity-100 transition-opacity flex-shrink-0 text-white"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="2"></circle></svg>
          <div>
            <h1 className="text-3xl font-light tracking-tighter opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-2.5 text-white">
              <span>Fractal<span className="font-bold">Audio</span></span>
              {isRecording && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
              )}
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/60 group-hover:text-white/90 transition-colors pointer-events-none mt-0.5">
              TRUSTNODELOGIC · 3D INK ENGINE
            </p>
          </div>
        </a>
      </div>

      {/* Customizable Artist Text Banner & Watermark */}
      <ArtistBanner config={bannerConfig} />

      <Controls
        audioMode={audioMode}
        switchMode={switchMode}
        isPlaying={isPlaying}
        togglePlayPause={togglePlayPause}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        setVolume={setVolume}
        fileName={fileName}
        loadAudioFile={loadAudioFile}
        seek={seek}
        zoom={zoom}
        setZoom={setZoom}
        iterations={iterations}
        setIterations={setIterations}
        colorBase={colorBase}
        setColorBase={setColorBase}
        juliaC={juliaC}
        setJuliaC={setJuliaC}
        sensitivity={sensitivity}
        setSensitivity={setSensitivity}
        geometryMode={geometryMode}
        setGeometryMode={setGeometryMode}
        fxMode={fxMode}
        setFxMode={setFxMode}
        kaleidoscopeFolds={kaleidoscopeFolds}
        setKaleidoscopeFolds={setKaleidoscopeFolds}
        rotSpeed={rotSpeed}
        setRotSpeed={setRotSpeed}
        glowIntensity={glowIntensity}
        setGlowIntensity={setGlowIntensity}
        randomize={randomize}

        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        hasSessionKeyframes={hasSessionKeyframes}
        startRecording={startRecording}
        stopRecording={stopRecording}
        takeSnapshot={takeSnapshot}
        exportSessionJson={exportSessionJson}

        bannerConfig={bannerConfig}
        setBannerConfig={setBannerConfig}

        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
      />

      {/* Floating Lower-Center Quick Action Dock */}
      <BottomBar
        audioMode={audioMode}
        switchMode={switchMode}
        isListening={isListening}
        isPlaying={isPlaying}
        togglePlayPause={togglePlayPause}
        loadAudioFile={loadAudioFile}
        fileName={fileName}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        startRecording={startRecording}
        stopRecording={stopRecording}
        takeSnapshot={takeSnapshot}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
      />

      {/* First Visit Onboarding Modal */}
      {audioMode === 'none' && (
        <OnboardingModal
          onSelectMic={() => switchMode('mic')}
          onSelectFile={(file) => loadAudioFile(file)}
          onSelectDemo={() => switchMode('demo')}
        />
      )}
    </div>
  );
}
