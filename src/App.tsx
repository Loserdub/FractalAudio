import React, { useState, useCallback, useRef } from 'react';
import { Visualizer, AudioMetrics } from './components/Visualizer';
import { Controls } from './components/Controls';
import { BottomBar } from './components/BottomBar';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { useMediaRecorder } from './hooks/useMediaRecorder';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Media & Session Automation Recorder Hook
  const {
    isRecording,
    recordingSeconds,
    hasSessionKeyframes,
    startRecording: startMediaRecording,
    stopRecording,
    recordKeyframe,
    exportSessionJson,
    takeSnapshot
  } = useMediaRecorder(canvasRef, audioStream);

  // 3D Fractal Engine State
  const [zoom, setZoomState] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0.0);
  const [offsetY, setOffsetY] = useState(0.0);
  const [iterations, setIterationsState] = useState(64);
  const [colorBase, setColorBaseState] = useState({ h: 0.45, s: 0.8, l: 0.5 });
  const [juliaC, setJuliaCState] = useState({ x: -0.8, y: 0.156 });
  const [sensitivity, setSensitivityState] = useState(3.0);

  // 3D Raymarching & Geometry States
  const [geometryMode, setGeometryModeState] = useState(1); // Default: 3D Mandelbulb
  const [fxMode, setFxModeState] = useState(1); // Default: Cyber Laser Grid
  const [kaleidoscopeFolds, setKaleidoscopeFoldsState] = useState(6); // Default: 6-fold
  const [rotSpeed, setRotSpeedState] = useState(1.0);
  const [glowIntensity, setGlowIntensityState] = useState(1.5);

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

  // Real-Time Audio Metrics State
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics | null>(null);

  const handleAudioMetricsUpdate = useCallback((metrics: AudioMetrics) => {
    setAudioMetrics(metrics);
  }, []);

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

  const randomize = () => {
    const newJulia = { x: (Math.random() * 4 - 2), y: (Math.random() * 4 - 2) };
    const newColor = { h: Math.random(), s: 0.6 + Math.random() * 0.4, l: 0.4 + Math.random() * 0.4 };
    const newZoom = 0.6 + Math.random() * 1.8;
    const newMode = Math.floor(Math.random() * 8);
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
  };

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
        onAudioMetricsUpdate={handleAudioMetricsUpdate}
      />
      
      <div className="absolute top-6 left-8 mix-blend-difference z-10">
        <a 
          href="https://trustnodelogic.com" 
          target="_blank" 
          rel="noopener noreferrer"
          title="Trust Node Logic — https://trustnodelogic.com"
          className="group flex items-center gap-3 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-disc animate-spin-slow text-lime-400 group-hover:text-white transition-colors flex-shrink-0"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="2"></circle></svg>
          <div>
            <h1 className="text-3xl font-light tracking-tighter opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-2.5">
              <span>Fractal<span className="font-bold">Audio</span></span>
              {isRecording && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
              )}
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-lime-400/80 group-hover:text-lime-400 transition-colors pointer-events-none mt-0.5">
              TRUSTNODELOGIC · 3D ENGINE
            </p>
          </div>
        </a>
      </div>

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
        audioMetrics={audioMetrics}

        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        hasSessionKeyframes={hasSessionKeyframes}
        startRecording={startRecording}
        stopRecording={stopRecording}
        takeSnapshot={takeSnapshot}
        exportSessionJson={exportSessionJson}
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
      />
    </div>
  );
}
