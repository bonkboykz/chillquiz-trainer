'use client';
import React, { useState, useRef } from 'react';
import { PlayCircle, PauseCircle, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MusicQuizApp = () => {
  const [audioFile, setAudioFile] = useState<string | null>(null);
  const [timeframes, setTimeframes] = useState<
    { start: number; end: number }[]
  >([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(URL.createObjectURL(file));
    }
  };

  const handleAddTimeframe = () => {
    if (audioRef.current) {
      const newTimeframe = {
        start: Math.floor(audioRef.current.currentTime),
        end: Math.min(
          Math.floor(audioRef.current.currentTime) + 10,
          audioRef.current.duration
        )
      };
      setTimeframes([...timeframes, newTimeframe]);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-8">Anime Music Quiz Trainer</h1>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600">
            <Upload className="mr-2" size={20} />
            Upload Audio
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {audioFile && (
          <div className="space-y-4">
            <audio ref={audioRef} src={audioFile} className="w-full" controls />

            <div className="flex gap-4">
              <button
                onClick={togglePlay}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                {isPlaying ? (
                  <PauseCircle className="mr-2" size={20} />
                ) : (
                  <PlayCircle className="mr-2" size={20} />
                )}
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button
                onClick={handleAddTimeframe}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Mark Current Time
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-xl font-semibold mb-2">Marked Timeframes:</h3>
              <div className="space-y-2">
                {timeframes.map((timeframe, index) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-100 rounded flex justify-between items-center"
                  >
                    <div>
                      {timeframe.start}s - {timeframe.end}s
                    </div>
                    <div>
                      <button
                        className="px-2 py-1 bg-red-500 text-white rounded-lg"
                        onClick={() =>
                          setTimeframes(
                            timeframes.filter((_, i) => i !== index)
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!audioFile && (
          <Alert>
            <AlertDescription>
              Upload an audio file to start creating your quiz timeframes
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default MusicQuizApp;
