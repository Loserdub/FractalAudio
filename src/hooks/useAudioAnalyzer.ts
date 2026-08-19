import { useEffect, useRef, useState, useCallback } from 'react';

export type AudioMode = 'mic' | 'file' | 'demo' | 'none';

export const useAudioAnalyzer = () => {
  const [audioMode, setAudioMode] = useState<AudioMode>('none');
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [fileName, setFileName] = useState<string>('Select Audio Input Source');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Demo Synth Sequencer Refs (Sample-Accurate Lookahead Clock)
  const demoTimerIdRef = useRef<number | null>(null);
  const demoStepRef = useRef<number>(0);
  const demoNextNoteTimeRef = useRef<number>(0);
  const volumeRef = useRef<number>(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Ensure AudioContext and MediaStreamDestination are initialized
  const getOrCreateAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      // Fast transient response to avoid artificial pre-lag
      analyser.smoothingTimeConstant = 0.05;

      const dest = ctx.createMediaStreamDestination();
      analyser.connect(dest);
      audioDestinationRef.current = dest;
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return { 
      ctx: audioContextRef.current, 
      analyser: analyserRef.current!, 
      audioStream: audioDestinationRef.current?.stream 
    };
  }, []);

  // Cleanup helper
  const stopAllSources = useCallback(() => {
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (demoTimerIdRef.current) {
      window.clearInterval(demoTimerIdRef.current);
      demoTimerIdRef.current = null;
    }

    setIsListening(false);
    setIsPlaying(false);
  }, []);

  // 1. SAMPLE-ACCURATE LOOKAHEAD GENERATIVE DEMO SYNTH SEQUENCER
  const startDemoSynth = useCallback(() => {
    stopAllSources();
    const { ctx, analyser } = getOrCreateAudioContext();

    setIsListening(true);
    setIsPlaying(true);
    setFileName('Generative Synth Loop (120 BPM)');

    const tempo = 120;
    const stepDuration = (60 / tempo) / 4; // 16th note in seconds (0.125s)
    const lookaheadMs = 25; // Interval timer interval (ms)
    const scheduleAheadTime = 0.1; // Schedule window ahead of AudioContext clock (seconds)

    demoStepRef.current = 0;
    demoNextNoteTimeRef.current = ctx.currentTime + 0.05;

    const scheduleStep = (step: number, time: number) => {
      const vol = volumeRef.current;

      // 1. Kick Drum (Steps 0, 4, 8, 12)
      if (step % 4 === 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(160, time);
        osc.frequency.exponentialRampToValueAtTime(32, time + 0.11);
        gain.gain.setValueAtTime(0.95 * vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
        osc.connect(gain);
        gain.connect(analyser);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.15);
      }

      // 2. Sub Bass (Steps 0, 2, 4, 6, 8, 10, 12, 14)
      const bassNotes = [55, 55, 65.41, 55, 49, 55, 65.41, 73.42];
      const bassFreq = bassNotes[Math.floor(step / 2) % bassNotes.length];
      if (step % 2 === 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, time);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, time);
        gain.gain.setValueAtTime(0.45 * vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(analyser);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.19);
      }

      // 3. Arp Synth (Odd steps)
      const arpScale = [440, 523.25, 659.25, 783.99, 880, 1046.5, 659.25, 523.25];
      if (step % 2 === 1) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const arpFreq = arpScale[(step + Math.floor(time * 2)) % arpScale.length];
        osc.frequency.setValueAtTime(arpFreq, time);
        gain.gain.setValueAtTime(0.28 * vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
        osc.connect(gain);
        gain.connect(analyser);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.12);
      }
    };

    const scheduler = () => {
      if (!ctx || ctx.state === 'closed') return;
      while (demoNextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
        scheduleStep(demoStepRef.current, demoNextNoteTimeRef.current);
        demoStepRef.current = (demoStepRef.current + 1) % 16;
        demoNextNoteTimeRef.current += stepDuration;
      }
    };

    scheduler();
    demoTimerIdRef.current = window.setInterval(scheduler, lookaheadMs);
  }, [stopAllSources, getOrCreateAudioContext]);

  // 2. MICROPHONE INPUT MODE
  const startMic = useCallback(async () => {
    try {
      stopAllSources();
      const { ctx, analyser } = getOrCreateAudioContext();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      micSourceRef.current = source;

      setIsListening(true);
      setIsPlaying(true);
      setAudioMode('mic');
      setFileName('Microphone Input (Live)');
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  }, [stopAllSources, getOrCreateAudioContext]);

  // 3. AUDIO FILE MODE
  const loadAudioFile = useCallback((file: File) => {
    stopAllSources();
    const { ctx, analyser } = getOrCreateAudioContext();

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;

    if (!audioElementRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audioElementRef.current = audio;
    }

    const audio = audioElementRef.current;
    audio.src = objectUrl;
    audio.volume = volume;

    if (!mediaElementSourceRef.current) {
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      mediaElementSourceRef.current = source;
    }

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
      setCurrentTime(0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
    };

    audio.play().then(() => {
      setIsListening(true);
      setIsPlaying(true);
    }).catch(err => console.error('Audio play error:', err));

    setFileName(file.name);
    setAudioMode('file');
  }, [stopAllSources, getOrCreateAudioContext, volume]);

  const togglePlayPause = useCallback(() => {
    if (audioMode === 'file' && audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.play();
        setIsPlaying(true);
      }
    } else if (audioMode === 'demo') {
      if (isPlaying) {
        stopAllSources();
        setIsListening(true);
        setIsPlaying(false);
      } else {
        startDemoSynth();
      }
    } else if (audioMode === 'mic') {
      if (isPlaying) {
        stopAllSources();
      } else {
        startMic();
      }
    }
  }, [audioMode, isPlaying, stopAllSources, startDemoSynth, startMic]);

  const switchMode = useCallback((mode: AudioMode) => {
    setAudioMode(mode);
    if (mode === 'demo') {
      startDemoSynth();
    } else if (mode === 'mic') {
      startMic();
    } else if (mode === 'file') {
      stopAllSources();
      setFileName('No File Selected');
    }
  }, [startDemoSynth, startMic, stopAllSources]);

  const seek = useCallback((seconds: number) => {
    if (audioMode === 'file' && audioElementRef.current) {
      audioElementRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, [audioMode]);

  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    volumeRef.current = val;
    if (audioElementRef.current) {
      audioElementRef.current.volume = val;
    }
  }, []);

  useEffect(() => {
    // Initialized without auto-playing demo track
    return () => {
      stopAllSources();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  return {
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
    analyser: analyserRef.current,
    audioStream: audioDestinationRef.current?.stream
  };
};
