import React, { useEffect, useRef } from 'react';
import { vertexShaderSource, fragmentShaderSource } from '../shaders/fractal';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  zoom: number;
  offsetX: number;
  offsetY: number;
  iterations: number;
  colorBase: { h: number; s: number; l: number };
  juliaC: { x: number; y: number };
  sensitivity: number;
}

export const Visualizer: React.FC<VisualizerProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  
  // Store props in a ref to access them in the render loop without restarting it
  const propsRef = useRef(props);
  
  // Update props ref whenever props change
  useEffect(() => {
    propsRef.current = props;
  }, [props]);

  // WebGL context and program refs
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  
  // Uniform locations
  const locationsRef = useRef<Record<string, WebGLUniformLocation | null>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    // Create Shaders
    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    // Create Program
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    
    gl.useProgram(program);
    programRef.current = program;

    // Set up geometry (full screen quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    locationsRef.current = {
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_zoom: gl.getUniformLocation(program, 'u_zoom'),
      u_offset: gl.getUniformLocation(program, 'u_offset'),
      u_c: gl.getUniformLocation(program, 'u_c'),
      u_iterations: gl.getUniformLocation(program, 'u_iterations'),
      u_color_base: gl.getUniformLocation(program, 'u_color_base'),
      u_audio_low: gl.getUniformLocation(program, 'u_audio_low'),
      u_audio_mid: gl.getUniformLocation(program, 'u_audio_mid'),
      u_audio_high: gl.getUniformLocation(program, 'u_audio_high'),
    };

    // Resize handler
    const handleResize = () => {
      if (canvas && gl) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Start Render Loop
    let dataArray: Uint8Array | null = null;
    let smoothedLow = 0;
    let smoothedMid = 0;
    let smoothedHigh = 0;

    const render = () => {
      const gl = glRef.current;
      const program = programRef.current;
      const locs = locationsRef.current;
      const currentProps = propsRef.current;
      
      if (!gl || !program) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      const time = (Date.now() - startTimeRef.current) * 0.001;
      
      if (canvasRef.current) {
         gl.uniform2f(locs.u_resolution, canvasRef.current.width, canvasRef.current.height);
      }

      // Audio Processing
      let targetLow = 0, targetMid = 0, targetHigh = 0;
      if (currentProps.analyser) {
        if (!dataArray || dataArray.length !== currentProps.analyser.frequencyBinCount) {
          dataArray = new Uint8Array(currentProps.analyser.frequencyBinCount);
        }
        currentProps.analyser.getByteFrequencyData(dataArray);
        
        // With fftSize 2048, frequencyBinCount is 1024.
        // Assuming ~44.1kHz sample rate, each bin is ~21.5Hz.
        // Bass: 20-250Hz -> bins 1-11
        // Mids: 250-2000Hz -> bins 12-93
        // Highs: 2000-10000Hz -> bins 94-465
        
        let lowMax = 0, midMax = 0, highMax = 0;
        let lowSum = 0, midSum = 0, highSum = 0;
        
        for (let i = 1; i < 465; i++) {
          // Apply a curve to make peaks stand out more
          const val = Math.pow(dataArray[i] / 255.0, 1.5); 
          
          if (i < 12) {
            lowSum += val;
            if (val > lowMax) lowMax = val;
          } else if (i < 94) {
            midSum += val;
            if (val > midMax) midMax = val;
          } else {
            highSum += val;
            if (val > highMax) highMax = val;
          }
        }
        
        // Blend average and peak for a dynamic, punchy feel
        targetLow = ((lowSum / 11) * 0.3 + lowMax * 0.7) * currentProps.sensitivity;
        targetMid = ((midSum / 82) * 0.3 + midMax * 0.7) * currentProps.sensitivity;
        targetHigh = ((highSum / 371) * 0.3 + highMax * 0.7) * currentProps.sensitivity;
      }

      // Smooth the values (easing) for fluid visual transitions
      smoothedLow += (targetLow - smoothedLow) * 0.15;
      smoothedMid += (targetMid - smoothedMid) * 0.15;
      smoothedHigh += (targetHigh - smoothedHigh) * 0.15;

      // Update Uniforms
      gl.uniform1f(locs.u_time, time);
      gl.uniform1f(locs.u_zoom, currentProps.zoom);
      gl.uniform2f(locs.u_offset, currentProps.offsetX, currentProps.offsetY);
      gl.uniform2f(locs.u_c, currentProps.juliaC.x, currentProps.juliaC.y);
      gl.uniform1i(locs.u_iterations, currentProps.iterations);
      gl.uniform3f(locs.u_color_base, currentProps.colorBase.h, currentProps.colorBase.s, currentProps.colorBase.l);
      
      gl.uniform1f(locs.u_audio_low, smoothedLow);
      gl.uniform1f(locs.u_audio_mid, smoothedMid);
      gl.uniform1f(locs.u_audio_high, smoothedHigh);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, []); // Run once on mount

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10"
    />
  );
};
