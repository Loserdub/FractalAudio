import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface SessionKeyframe {
  timestampSec: number;
  params: Record<string, any>;
}

export const useMediaRecorder = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  audioStream?: MediaStream | null
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasSessionKeyframes, setHasSessionKeyframes] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Session Automation Timeline
  const keyframesRef = useRef<SessionKeyframe[]>([]);

  // 1. START RECORDING (WITH TRUSTNODELOGIC WATERMARK BURN-IN)
  const startRecording = useCallback((initialParams?: Record<string, any>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas not found for recording');
      return;
    }

    try {
      recordedChunksRef.current = [];
      keyframesRef.current = [];
      startTimeRef.current = Date.now();

      if (initialParams) {
        keyframesRef.current.push({
          timestampSec: 0,
          params: initialParams
        });
        setHasSessionKeyframes(true);
      }

      // Create Offscreen 2D Watermark Composite Canvas
      const watermarkCanvas = document.createElement('canvas');
      watermarkCanvas.width = canvas.width;
      watermarkCanvas.height = canvas.height;
      const ctx2d = watermarkCanvas.getContext('2d');

      // Frame compositor loop to burn watermark into 60FPS video stream
      const drawWatermarkedFrame = () => {
        if (!ctx2d || !canvas) return;

        // Draw WebGL Canvas frame
        ctx2d.drawImage(canvas, 0, 0);

        // Draw Small TRUSTNODELOGIC Watermark in Bottom-Right Corner
        ctx2d.save();
        const fontSize = Math.max(12, Math.floor(watermarkCanvas.height * 0.018));
        ctx2d.font = `600 ${fontSize}px "IBM Plex Mono", monospace`;
        ctx2d.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx2d.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx2d.shadowBlur = 6;
        ctx2d.shadowOffsetX = 1;
        ctx2d.shadowOffsetY = 1;

        const text = '⚡ TRUSTNODELOGIC';
        const textMetrics = ctx2d.measureText(text);
        const padding = fontSize * 1.2;
        const x = watermarkCanvas.width - textMetrics.width - padding;
        const y = watermarkCanvas.height - padding;

        // Subtle dark background pill behind watermark for extra contrast
        ctx2d.fillStyle = 'rgba(9, 10, 13, 0.65)';
        ctx2d.beginPath();
        ctx2d.roundRect(x - 8, y - fontSize, textMetrics.width + 16, fontSize + 8, 4);
        ctx2d.fill();

        // Watermark Text
        ctx2d.fillStyle = '#a3e635'; // Acid Green accent
        ctx2d.fillText('⚡', x - 4, y);
        ctx2d.fillStyle = 'rgba(242, 242, 240, 0.9)';
        ctx2d.fillText('TRUSTNODELOGIC', x + fontSize * 0.9, y);

        ctx2d.restore();

        animFrameRef.current = requestAnimationFrame(drawWatermarkedFrame);
      };

      drawWatermarkedFrame();

      // Capture 60FPS Video Stream from Watermarked Composite Canvas
      const videoStream = watermarkCanvas.captureStream(60);
      const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

      // Combine Audio Tracks if available
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        audioStream.getAudioTracks().forEach(track => combinedTracks.push(track));
      }

      const combinedStream = new MediaStream(combinedTracks);

      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000 // 8 Mbps high bitrate
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }

        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.download = `FractalAudio_TRUSTNODELOGIC_${timestamp}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting video recording:', err);
    }
  }, [canvasRef, audioStream]);

  // 2. STOP RECORDING
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // 3. RECORD PARAMETER KEYFRAME CHANGE
  const recordKeyframe = useCallback((params: Record<string, any>) => {
    if (!isRecording) return;
    const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
    keyframesRef.current.push({
      timestampSec: parseFloat(elapsedSec.toFixed(2)),
      params
    });
    setHasSessionKeyframes(true);
  }, [isRecording]);

  // 4. EXPORT SESSION AUTOMATION JSON
  const exportSessionJson = useCallback(() => {
    if (keyframesRef.current.length === 0) return;
    const jsonStr = JSON.stringify({
      app: 'FractalAudio',
      brand: 'Trust Node Logic',
      url: 'https://trustnodelogic.com',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      totalKeyframes: keyframesRef.current.length,
      timeline: keyframesRef.current
    }, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FractalAudio_Session_Automation_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // 5. TAKE HIGH-RES PNG SNAPSHOT (WITH TRUSTNODELOGIC WATERMARK)
  const takeSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = canvas.width;
      snapCanvas.height = canvas.height;
      const ctx2d = snapCanvas.getContext('2d');
      if (!ctx2d) return;

      // Draw WebGL Canvas frame
      ctx2d.drawImage(canvas, 0, 0);

      // Draw TRUSTNODELOGIC Watermark
      const fontSize = Math.max(14, Math.floor(snapCanvas.height * 0.018));
      ctx2d.font = `600 ${fontSize}px "IBM Plex Mono", monospace`;
      ctx2d.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx2d.shadowBlur = 6;
      
      const text = '⚡ TRUSTNODELOGIC';
      const textMetrics = ctx2d.measureText(text);
      const padding = fontSize * 1.2;
      const x = snapCanvas.width - textMetrics.width - padding;
      const y = snapCanvas.height - padding;

      ctx2d.fillStyle = 'rgba(9, 10, 13, 0.7)';
      ctx2d.beginPath();
      ctx2d.roundRect(x - 8, y - fontSize, textMetrics.width + 16, fontSize + 8, 4);
      ctx2d.fill();

      ctx2d.fillStyle = '#a3e635';
      ctx2d.fillText('⚡', x - 4, y);
      ctx2d.fillStyle = 'rgba(242, 242, 240, 0.9)';
      ctx2d.fillText('TRUSTNODELOGIC', x + fontSize * 0.9, y);

      const dataUrl = snapCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `FractalAudio_TRUSTNODELOGIC_${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error capturing canvas snapshot:', err);
    }
  }, [canvasRef]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return {
    isRecording,
    recordingSeconds,
    hasSessionKeyframes,
    startRecording,
    stopRecording,
    recordKeyframe,
    exportSessionJson,
    takeSnapshot
  };
};
