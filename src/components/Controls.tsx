import React, { useState } from 'react';
import { Settings, Mic, MicOff, ChevronDown, ChevronUp, Shuffle } from 'lucide-react';
import { JULIA_PRESETS } from '../constants';

interface ControlsProps {
  isListening: boolean;
  toggleMic: () => void;
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
  randomize: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isListening,
  toggleMic,
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
  randomize,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="fixed top-4 right-4 z-10 flex flex-col items-end gap-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/10 transition-colors border border-white/10"
      >
        {isOpen ? <ChevronUp size={20} /> : <Settings size={20} />}
      </button>

      {isOpen && (
        <div className="bg-black/60 backdrop-blur-xl p-6 rounded-2xl border border-white/10 w-80 shadow-2xl text-white/90 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium tracking-tight">Visualizer Settings</h2>
            <div className="flex gap-2">
              <button
                onClick={randomize}
                className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                title="Randomize Parameters"
              >
                <Shuffle size={18} />
              </button>
              <button
                onClick={toggleMic}
                className={`p-2 rounded-full transition-all ${
                  isListening 
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isListening ? "Stop Microphone" : "Start Microphone"}
              >
                {isListening ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Zoom */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-wider text-white/50">
                <label>Zoom</label>
                <span>{zoom.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Iterations */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-wider text-white/50">
                <label>Complexity</label>
                <span>{iterations}</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="1"
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Julia Constant Presets */}
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-white/50 mb-2">Shape Presets</div>
              <div className="grid grid-cols-2 gap-2">
                {JULIA_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setJuliaC({ x: preset.x, y: preset.y })}
                    className={`px-2 py-1.5 text-xs rounded-md transition-colors text-left ${
                      Math.abs(juliaC.x - preset.x) < 0.001 && Math.abs(juliaC.y - preset.y) < 0.001
                        ? 'bg-white text-black font-medium'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Julia Constant Manual */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-wider text-white/50">
                <label>Shape (Real)</label>
                <span>{juliaC.x.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="-2.0"
                max="2.0"
                step="0.001"
                value={juliaC.x}
                onChange={(e) => setJuliaC({ ...juliaC, x: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-wider text-white/50">
                <label>Shape (Imaginary)</label>
                <span>{juliaC.y.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="-2.0"
                max="2.0"
                step="0.001"
                value={juliaC.y}
                onChange={(e) => setJuliaC({ ...juliaC, y: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            {/* Color Base */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-wider text-white/50">
                <label>Hue Shift</label>
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

            {/* Sensitivity */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-wider text-white/50">
                <label>Audio Sensitivity</label>
                <span>{sensitivity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="8.0"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
