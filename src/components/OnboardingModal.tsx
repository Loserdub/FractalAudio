import React, { useRef } from 'react';
import { Mic, Upload, Music, Sparkles } from 'lucide-react';
import { AudioMode } from '../hooks/useAudioAnalyzer';

interface OnboardingModalProps {
  onSelectMic: () => void;
  onSelectFile: (file: File) => void;
  onSelectDemo: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onSelectMic,
  onSelectFile,
  onSelectDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        className="hidden"
      />

      <div className="bg-zinc-950/90 border border-white/20 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6 text-center text-white relative overflow-hidden">
        
        {/* Glow Accent Backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-lime-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="space-y-3 relative z-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-lime-400/20 to-sky-400/20 border border-lime-400/40 flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-lime-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-light tracking-tighter">
            Fractal<span className="font-bold">Audio</span>
          </h2>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-lime-400">
            3D Audio-Visual Engine
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-white/70 leading-relaxed relative z-10">
          Select an audio input source to launch real-time 3D fractal rendering, sacred geometry, and multi-band beat reaction:
        </p>

        {/* Primary Action Buttons */}
        <div className="space-y-3 relative z-10">
          
          {/* 1. MICROPHONE INPUT */}
          <button
            onClick={onSelectMic}
            className="w-full py-3.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-mono font-bold text-sm tracking-wider transition-all shadow-lg hover:shadow-lime-400/20 flex items-center justify-center gap-2.5 group active:scale-[0.98]"
          >
            <Mic className="w-5 h-5 text-black group-hover:scale-110 transition-transform" />
            <span>USE LIVE MICROPHONE</span>
          </button>

          {/* 2. UPLOAD SONG */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono font-bold text-sm tracking-wider transition-all shadow-lg flex items-center justify-center gap-2.5 group active:scale-[0.98]"
          >
            <Upload className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>UPLOAD AUDIO FILE (MP3 / WAV)</span>
          </button>

          {/* 3. TRY DEMO LOOP */}
          <button
            onClick={onSelectDemo}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-mono text-xs tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <Music className="w-4 h-4 text-purple-400" />
            <span>Or Play Generative Demo Loop</span>
          </button>
        </div>

        <div className="pt-2 text-[10px] font-mono text-white/40 uppercase tracking-widest relative z-10">
          POWERED BY TRUSTNODELOGIC · WEB AUDIO API
        </div>

      </div>
    </div>
  );
};
