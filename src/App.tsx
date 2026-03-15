import React, { useState } from 'react';
import { Visualizer } from './components/Visualizer';
import { Controls } from './components/Controls';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';

export default function App() {
  const { isListening, startListening, stopListening, analyser } = useAudioAnalyzer();

  // Fractal State
  const [zoom, setZoom] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0.0);
  const [offsetY, setOffsetY] = useState(0.0);
  const [iterations, setIterations] = useState(64);
  const [colorBase, setColorBase] = useState({ h: 0.5, s: 0.6, l: 0.5 });
  const [juliaC, setJuliaC] = useState({ x: -0.8, y: 0.156 });
  const [sensitivity, setSensitivity] = useState(2.5);

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const randomize = () => {
    setJuliaC({
      x: (Math.random() * 4 - 2), // -2 to 2
      y: (Math.random() * 4 - 2)  // -2 to 2
    });
    setColorBase({
      h: Math.random(),
      s: 0.5 + Math.random() * 0.5,
      l: 0.4 + Math.random() * 0.4
    });
    setZoom(0.5 + Math.random() * 2);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden text-white font-sans">
      <Visualizer
        analyser={analyser}
        zoom={zoom}
        offsetX={offsetX}
        offsetY={offsetY}
        iterations={iterations}
        colorBase={colorBase}
        juliaC={juliaC}
        sensitivity={sensitivity}
      />
      
      <div className="absolute top-6 left-8 mix-blend-difference z-10">
        <a 
          href="https://www.jray.me" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block hover:opacity-100 transition-opacity cursor-pointer"
        >
          <h1 className="text-4xl font-light tracking-tighter opacity-80 hover:opacity-100 transition-opacity">
            Fractal<span className="font-bold">Audio</span>
          </h1>
        </a>
        <p className="text-xs uppercase tracking-[0.2em] opacity-50 mt-1 pointer-events-none">
          Generative Reactive Visualizer
        </p>
      </div>

      <Controls
        isListening={isListening}
        toggleMic={toggleMic}
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
        randomize={randomize}
      />
    </div>
  );
}
