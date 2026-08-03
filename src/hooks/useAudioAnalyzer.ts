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

  // Demo Synth Sequencer Refs
  const demoIntervalRef = useRef<number | null>(null);
  const demoStepRef = useRef<number>(0);

  // Ensure AudioContext and MediaStreamDestination are initialized
  const getOrCreateAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

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
    if (demoIntervalRef.current) {
      window.clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }

    setIsListening(false);
    setIsPlaying(false);
  }, []);

  // 1. GENERATIVE DEMO SYNTH SEQUENCER
  const startDemoSynth = useCallback(() => {
    stopAllSources();
    const { ctx, analyser } = getOrCreateAudioContext();

    setIsListening(true);
    setIsPlaying(true);
    setFileName('Generative Synth Loop (120 BPM)');

    const tempo = 120;
    const stepTime = (60 / tempo) / 4 * 1000;
    demoStepRef.current = 0;

    const playStep = () => {
      if (!ctx || ctx.state === 'closed') return;
      const now = ctx.currentTime;
      const step = demoStepRef.current;

      // 1. Kick Drum
      if (step % 4 === 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
        gain.gain.setValueAtTime(0.9 * volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(analyser);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }

      // 2. Sub Bass
      const bassNotes = [55, 55, 65.41, 55, 49, 55, 65.41, 73.42];
      const bassFreq = bassNotes[(step / 2) % bassNotes.length];
      if (step % 2 === 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);
        gain.gain.setValueAtTime(0.4 * volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(analyser);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }

      // 3. Arp Synth
      const arpScale = [440, 523.25, 659.25, 783.99, 880, 1046.5, 659.25, 523.25];
      if (step % 2 === 1) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const arpFreq = arpScale[(step + Math.floor(now)) % arpScale.length];
        osc.frequency.setValueAtTime(arpFreq, now);
        gain.gain.setValueAtTime(0.25 * volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(analyser);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }

      demoStepRef.current = (step + 1) % 16;
    };

    playStep();
    demoIntervalRef.current = window.setInterval(playStep, stepTime);
  }, [stopAllSources, getOrCreateAudioContext, volume]);

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
