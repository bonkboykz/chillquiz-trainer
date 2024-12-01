import { useState, useEffect, useRef, RefObject } from 'react';

interface AudioPlaybackOptions {
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  audioElement?: RefObject<HTMLAudioElement>;
}

interface AudioPlaybackControl {
  play: (startTime?: number, endTime?: number) => Promise<void>;
  pause: () => void;
  stop: () => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: Error | null;
  audioRef: RefObject<HTMLAudioElement | null>;
}

export function useAudioPlayback(
  audioId: string,
  options: AudioPlaybackOptions = {}
): AudioPlaybackControl {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const endTimeRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioId || !audioRef.current) return;

    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      options.onTimeUpdate?.(audio.currentTime);

      if (endTimeRef.current && audio.currentTime >= endTimeRef.current) {
        audio.pause();
        setIsPlaying(false);
        endTimeRef.current = null;
        options.onEnded?.();
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      options.onEnded?.();
    };

    const handleError = async (e: ErrorEvent | Event) => {
      console.error('Audio error:', e);

      if (!navigator.onLine) {
        const error = new Error('No internet connection');
        setError(error);
        options.onError?.(error);
        return;
      }

      const error = new Error('Error playing audio');
      setError(error);
      options.onError?.(error);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioId, options]);

  const play = async (startTime?: number, endTime?: number) => {
    if (!audioRef.current) return;

    try {
      if (typeof startTime === 'number') {
        audioRef.current.currentTime = startTime;
      }

      if (typeof endTime === 'number') {
        endTimeRef.current = endTime;
      } else {
        endTimeRef.current = null;
      }

      setError(null);
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Error playing audio');
      setError(error);
      setIsPlaying(false);
      throw error;
    }
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const stop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    endTimeRef.current = null;
    setIsPlaying(false);
  };

  return {
    play,
    pause,
    stop,
    isPlaying,
    currentTime,
    duration,
    error,
    audioRef
  };
}
