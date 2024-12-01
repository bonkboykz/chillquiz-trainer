import { useState, useEffect, useRef } from 'react';

interface AudioPlaybackOptions {
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

interface AudioPlaybackControl {
  play: (startTime?: number, endTime?: number) => Promise<void>;
  pause: () => void;
  stop: () => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  error: Error | null;
}

export function useAudioPlayback(
  audioId: string,
  options: AudioPlaybackOptions = {}
): AudioPlaybackControl {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioId || audioRef.current) {
      return;
    }

    const audio = new Audio();
    audioRef.current = audio;

    const audioUrl = `/api/audio/${audioId}`;

    audio.src = audioUrl;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      options.onTimeUpdate?.(audio.currentTime);

      if (endTimeRef.current && audio.currentTime >= endTimeRef.current) {
        audio.pause();
        setIsPlaying(false);
        endTimeRef.current = null;
        options.onEnded?.();
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      options.onEnded?.();
    });

    const handleError = (e: ErrorEvent | Event) => {
      console.error('Audio error:', e);
      // Check network error
      if (!navigator.onLine) {
        setError(new Error('No internet connection'));
        return;
      }

      // Check if audio file exists
      fetch(audioUrl, { method: 'HEAD' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        })
        .catch((fetchError) => {
          console.error('Fetch error:', fetchError);
          setError(new Error(`Failed to load audio: ${fetchError.message}`));
        });

      const errorMessage =
        e instanceof ErrorEvent ? e.message : 'Error playing audio';
      const error = new Error(errorMessage);
      setError(error);
      options.onError?.(error);
      setIsPlaying(false);
    };

    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.remove();
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

      await audioRef.current.play();
      setIsPlaying(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error playing audio'));
      throw err;
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
    setIsPlaying(false);
  };

  return {
    play,
    pause,
    stop,
    isPlaying,
    currentTime,
    duration,
    error
  };
}
