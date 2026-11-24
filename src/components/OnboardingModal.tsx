import React, { useRef } from 'react';
import { Mic, Upload, Music } from 'lucide-react';
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

      <div className="studio-surface studio-welcome p-7 sm:p-8 max-w-md w-full space-y-6 text-left text-white relative overflow-hidden">
        
        {/* Icon & Title */}
        <div className="space-y-3 relative z-10">
          <h2 className="text-3xl font-light tracking-tighter">
            Fractal<span className="font-bold">Audio</span>
          </h2>
        </div>

        {/* Description */}
        <p className="text-sm text-white/70 leading-relaxed relative z-10">
          Choose an audio source to start the visualizer.
        </p>

        {/* Primary Action Buttons */}
        <div className="space-y-3 relative z-10">
          
          {/* 1. MICROPHONE INPUT */}
          <button
            onClick={onSelectMic}
            className="w-full py-3.5 px-4 rounded-md studio-primary font-bold text-sm transition-all flex items-center justify-center gap-2.5 group active:scale-[0.98]"
          >
            <Mic className="w-5 h-5 text-current " />
            <span>Use microphone</span>
          </button>

          {/* 2. UPLOAD SONG */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3.5 px-4 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition-all flex items-center justify-center gap-2.5 group active:scale-[0.98]"
          >
            <Upload className="w-5 h-5 text-neutral-300 " />
            <span>Open audio file</span>
          </button>

          {/* 3. TRY DEMO LOOP */}
          <button
            onClick={onSelectDemo}
            className="w-full py-2.5 px-4 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-all flex items-center justify-center gap-2"
          >
            <Music className="w-4 h-4 text-neutral-300" />
            <span>Play demo loop</span>
          </button>
        </div>

        <div className="pt-2 text-xs text-neutral-400 relative z-10 flex items-center justify-center gap-1.5 flex-wrap">
          <span>Powered by</span>
          <a 
            href="https://trustnodelogic.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-neutral-300/80 hover:text-neutral-300 underline transition-colors"
          >
            Trust Node Logic
          </a>
          <span>Â· Justin Ray (JRay)</span>
        </div>

      </div>
    </div>
  );
};
