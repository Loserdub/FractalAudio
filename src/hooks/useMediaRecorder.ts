import { useState, useRef, useCallback, useEffect } from 'react';

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
  const startTimeRef = useRef<number>(0);

  // Session Automation Timeline
  const keyframesRef = useRef<SessionKeyframe[]>([]);

  // 1. START RECORDING
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

      // Capture 60FPS Video Stream from WebGL Canvas
      const canvasStream = canvas.captureStream(60);
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

      // Combine Audio Tracks if available
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        audioStream.getAudioTracks().forEach(track => combinedTracks.push(track));
      }

      const combinedStream = new MediaStream(combinedTracks);

      // Determine best supported codec
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
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.download = `FractalAudio_Recording_${timestamp}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      };

      recorder.start(500); // Record in 500ms chunks
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

  // 5. TAKE HIGH-RES PNG SNAPSHOT
  const takeSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `FractalAudio_Snapshot_${timestamp}.png`;
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
