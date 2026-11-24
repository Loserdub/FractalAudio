import React, { useRef } from 'react';
import { Mic, MicOff, Upload, Play, Pause, Disc, Camera, Music, Sparkles, Maximize, Minimize } from 'lucide-react';
import { AudioMode } from '../hooks/useAudioAnalyzer';

interface BottomBarProps {
  audioMode: AudioMode;
  switchMode: (mode: AudioMode) => void;
  isListening: boolean;
  isPlaying: boolean;
  togglePlayPause: () => void;
  loadAudioFile: (file: File) => void;
  fileName: string;
  isRecording: boolean;
  recordingSeconds: number;
  startRecording: () => void;
  stopRecording: () => void;
  takeSnapshot: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const formatTime = (secs: number) => {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const BottomBar: React.FC<BottomBarProps> = React.memo(({
  audioMode,
  switchMode,
  isListening,
  isPlaying,
  togglePlayPause,
  loadAudioFile,
  fileName,
  isRecording,
  recordingSeconds,
  startRecording,
  stopRecording,
  takeSnapshot,
  isFullscreen,
  toggleFullscreen,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadAudioFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 max-w-[95vw]">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        className="hidden"
      />

      <div className="studio-surface studio-dock p-2 flex items-center gap-3 text-white">
        
        {/* 1. PLAY / PAUSE TOGGLE */}
        <button
          onClick={togglePlayPause}
          className={`p-3 rounded-md transition-all flex items-center justify-center  ${
            isPlaying 
              ? 'studio-selected hover:bg-neutral-700 active:scale-95'
              : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
          }`}
          title={isPlaying ? "Pause Track" : "Play Track"}
        >
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="white" className="ml-0.5" />}
        </button>

        {/* TRACK TITLE DISPLAY */}
        <div className="hidden md:flex flex-col max-w-[140px] truncate border-r border-white/10 pr-3">
          <span className="text-xs text-neutral-300 block truncate">
            {audioMode === 'mic' ? 'Live Input' : audioMode === 'demo' ? 'Generative Demo' : 'Local Track'}
          </span>
          <span className="text-xs font-medium text-white truncate block">{fileName}</span>
        </div>

        {/* 2. MIC TOGGLE (ON / OFF) */}
        <button
          onClick={() => {
            if (audioMode === 'mic' && isListening) {
              switchMode('demo');
            } else {
              switchMode('mic');
            }
          }}
          className={`px-3.5 py-2 rounded-md text-xs  font-bold  transition-all flex items-center gap-1.5 ${
            audioMode === 'mic' && isListening
              ? 'bg-neutral-300/20 text-neutral-300 border border-neutral-300/50 '
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title={audioMode === 'mic' ? "Turn Off Microphone" : "Turn On Microphone"}
        >
          {audioMode === 'mic' && isListening ? <Mic size={15} /> : <MicOff size={15} />}
          <span className="hidden sm:inline">{audioMode === 'mic' && isListening ? 'Mic on' : 'Mic off'}</span>
        </button>

        {/* 3. Open file BUTTON */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`px-3.5 py-2 rounded-md text-xs  font-bold  transition-all flex items-center gap-1.5 ${
            audioMode === 'file'
              ? 'bg-neutral-300/20 text-neutral-300 border border-neutral-300/50 '
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
          }`}
          title="Upload MP3 / WAV Song"
        >
          <Upload size={15} />
          <span className="hidden sm:inline">Open file</span>
        </button>

        {/* 4. DEMO TRACK SWITCHER */}
        <button
          onClick={() => switchMode('demo')}
          className={`p-2 rounded-md transition-all ${
            audioMode === 'demo'
              ? 'text-neutral-300 bg-neutral-300/15 border border-neutral-300/40'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="Switch to Demo Track"
        >
          <Music size={16} />
        </button>

        <div className="h-6 w-[1px] bg-white/15 mx-0.5" />

        {/* 5. VIDEO RECORD BUTTON */}
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-4 py-2 rounded-md studio-selected text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            title="Start Recording Video"
          >
            <Disc size={15} />
            <span>Record</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-4 py-2 rounded-md bg-zinc-900 border border-neutral-300 text-neutral-300 hover:bg-neutral-600/20 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Stop Recording Video"
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-neutral-700" />
            <span>Stop ({formatTime(recordingSeconds)})</span>
          </button>
        )}

        {/* 6. SNAPSHOT PNG BUTTON */}
        <button
          onClick={takeSnapshot}
          className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
          title="Take PNG Snapshot"
        >
          <Camera size={16} />
        </button>

        {/* 7. FULLSCREEN TOGGLE BUTTON */}
        <button
          onClick={toggleFullscreen}
          className={`p-2 rounded-md transition-all border ${
            isFullscreen
              ? 'studio-selected hover:bg-neutral-700 '
              : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
          }`}
          title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

      </div>
    </div>
  );
});
