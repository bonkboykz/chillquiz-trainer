'use client';
import React, { useState, useRef } from 'react';
import { Upload, Plus, Trash2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CreateQuiz = () => {
  interface AudioFile {
    file: File;
    title: string;
    artist: string;
    source: string;
    timeframes: {
      startTime: number;
      endTime: number;
      options: {
        text: string;
        isCorrect: boolean;
      }[];
    }[];
  }

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(0);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [timeframes, setTimeframes] = useState<Record<string, any>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    setAudioFiles((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: '',
        source: '',
        timeframes: []
      }))
    ]);
  };

  const handleTimeframeAdd = (audioIndex: number) => {
    if (audioRef.current) {
      const currentTime = Math.floor(audioRef.current.currentTime);
      const newTimeframe = {
        startTime: currentTime,
        endTime: Math.min(currentTime + 10, audioRef.current.duration),
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ]
      };

      setAudioFiles((prev) => {
        const updated = [...prev];
        updated[audioIndex].timeframes = [
          ...(updated[audioIndex].timeframes || []),
          newTimeframe
        ];
        return updated;
      });
    }
  };

  const handleOptionChange: (
    audioIndex: number,
    timeframeIndex: number,
    optionIndex: number,
    value: string
  ) => void = (audioIndex, timeframeIndex, optionIndex, value) => {
    setAudioFiles((prev) => {
      const updated = [...prev];
      updated[audioIndex].timeframes[timeframeIndex].options[optionIndex].text =
        value;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, upload audio files
      const uploadedAudios = await Promise.all(
        audioFiles.map(async (audioFile) => {
          const formData = new FormData();
          formData.append('file', audioFile.file);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });

          const { filepath, filename } = await uploadRes.json();

          return {
            ...audioFile,
            filename,
            filepath,
            duration: Math.floor(audioRef.current?.duration || 0)
          };
        })
      );

      // Then create the quiz with the uploaded files
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          isPublic,
          audioData: uploadedAudios.map((audio) => ({
            title: audio.title,
            artist: audio.artist,
            source: audio.source,
            filename: audio.filename,
            filepath: audio.filepath,
            duration: audio.duration,
            timeframes: audio.timeframes.map((tf) => ({
              startTime: tf.startTime,
              endTime: tf.endTime,
              options: tf.options
            }))
          }))
        })
      });

      if (response.ok) {
        window.location.href = '/quizzes';
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Create New Quiz</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Quiz Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <Label htmlFor="isPublic">Make quiz public</Label>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="block">Audio Files</Label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              onClick={() => document.getElementById('audio-upload')?.click()}
              className="flex items-center gap-2"
            >
              <Upload size={20} />
              Add Audio Files
            </Button>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {audioFiles.map((audio, audioIndex) => (
            <div key={audioIndex} className="border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Title"
                  value={audio.title}
                  onChange={(e) => {
                    const updated = [...audioFiles];
                    updated[audioIndex].title = e.target.value;
                    setAudioFiles(updated);
                  }}
                />
                <Input
                  placeholder="Artist"
                  value={audio.artist}
                  onChange={(e) => {
                    const updated = [...audioFiles];
                    updated[audioIndex].artist = e.target.value;
                    setAudioFiles(updated);
                  }}
                />
                <Input
                  placeholder="Source (Anime)"
                  value={audio.source}
                  onChange={(e) => {
                    const updated = [...audioFiles];
                    updated[audioIndex].source = e.target.value;
                    setAudioFiles(updated);
                  }}
                />
              </div>

              <audio
                ref={audioIndex === currentAudioIndex ? audioRef : null}
                src={URL.createObjectURL(audio.file)}
                controls
                className="w-full"
              />

              <Button
                type="button"
                onClick={() => handleTimeframeAdd(audioIndex)}
                className="flex items-center gap-2"
              >
                <Clock size={20} />
                Add Timeframe
              </Button>

              {audio.timeframes.map((timeframe, timeframeIndex) => (
                <div
                  key={timeframeIndex}
                  className="border rounded p-4 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span>
                      {timeframe.startTime}s - {timeframe.endTime}s
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        const updated = [...audioFiles];
                        updated[audioIndex].timeframes.splice(
                          timeframeIndex,
                          1
                        );
                        setAudioFiles(updated);
                      }}
                    >
                      <Trash2 size={20} />
                    </Button>
                  </div>

                  {timeframe.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={option.isCorrect}
                        onChange={() => {
                          const updated = [...audioFiles];
                          updated[audioIndex].timeframes[
                            timeframeIndex
                          ].options = updated[audioIndex].timeframes[
                            timeframeIndex
                          ].options.map((opt, idx) => ({
                            ...opt,
                            isCorrect: idx === optionIndex
                          }));
                          setAudioFiles(updated);
                        }}
                      />
                      <Input
                        placeholder={`Option ${optionIndex + 1}`}
                        value={option.text}
                        onChange={(e) =>
                          handleOptionChange(
                            audioIndex,
                            timeframeIndex,
                            optionIndex,
                            e.target.value
                          )
                        }
                        required
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating Quiz...' : 'Create Quiz'}
        </Button>
      </form>
    </div>
  );
};

export default CreateQuiz;
