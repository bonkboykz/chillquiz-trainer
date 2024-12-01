'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  PlayCircle,
  PauseCircle,
  SkipForward,
  Volume2,
  VolumeX,
  Timer
} from 'lucide-react';
import { useAudioPlayback } from '@/components/hooks/useAudioPlayback';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Question {
  timeframeId: string;
  audioId: string;
  startTime: number;
  endTime: number;
  options: {
    id: string;
    text: string;
  }[];
  correctOptionId: string;
}

const QuizGame = ({ quizId }: { quizId: string }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<
    Array<{ selected: string; correct: string }>
  >([]);

  const currentQuestion = questions[currentQuestionIndex];

  // console.log('currentQuestion', currentQuestion);

  const { play, pause, isPlaying, currentTime, duration, error, audioRef } =
    useAudioPlayback(currentQuestion?.audioId ?? '', {
      onTimeUpdate: (time) => {
        if (timeLeft === null) return;
        const remaining = Math.max(0, currentQuestion.endTime - time);
        setTimeLeft(remaining);
      },
      onEnded: () => {
        setTimeLeft(0);
      }
    });

  useEffect(() => {
    fetchQuizQuestions();
  }, [quizId]);

  const fetchQuizQuestions = async () => {
    try {
      const response = await fetch(`/api/quiz/${quizId}/play`);
      if (!response.ok) throw new Error('Failed to fetch quiz');
      const data = await response.json();
      setQuestions(data.questions);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      setIsLoading(false);
    }
  };

  const playCurrentSegment = async () => {
    if (!currentQuestion || !audioRef.current) return;

    try {
      audioRef.current.muted = isMuted;
      await play(currentQuestion.startTime, currentQuestion.endTime);
      setTimeLeft(currentQuestion.endTime - currentQuestion.startTime);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleAnswerSelect = async (optionId: string) => {
    if (selectedAnswer) return;

    setSelectedAnswer(optionId);
    pause();

    const isCorrect = optionId === currentQuestion.correctOptionId;
    if (isCorrect) {
      setScore(score + 1);
    }

    setAnswers([
      ...answers,
      {
        selected: optionId,
        correct: currentQuestion.correctOptionId
      }
    ]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setTimeLeft(null);
    } else {
      setIsQuizComplete(true);
      saveQuizAttempt();
    }
  };

  const saveQuizAttempt = async () => {
    try {
      await fetch('/api/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          score,
          maxScore: questions.length,
          answers
        })
      });
    } catch (error) {
      console.error('Error saving attempt:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50">
        <CardContent className="p-6">
          <p className="text-red-600">Error loading audio: {error.message}</p>
          <Button onClick={fetchQuizQuestions} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isQuizComplete) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
          <div className="space-y-4">
            <p className="text-xl">
              Final Score: {score}/{questions.length}
            </p>
            <p className="text-lg">
              Accuracy: {((score / questions.length) * 100).toFixed(1)}%
            </p>
            <Progress
              value={(score / questions.length) * 100}
              className="h-3"
            />
            <Button
              onClick={() => (window.location.href = '/quizzes')}
              className="mt-4"
            >
              Back to Quizzes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <audio
        ref={audioRef}
        src={currentQuestion ? `/api/audio/${currentQuestion.audioId}` : ''}
        preload="auto"
        style={{ display: 'none' }}
      />
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Question {currentQuestionIndex + 1} of {questions.length}
        </h2>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          <span className="text-lg font-medium">Score: {score}</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {timeLeft !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Timer className="h-4 w-4" />
              <span>{Math.ceil(timeLeft)}s remaining</span>
              <Progress
                value={
                  (timeLeft /
                    (currentQuestion.endTime - currentQuestion.startTime)) *
                  100
                }
                className="flex-1 h-2"
              />
            </div>
          )}

          <Button
            onClick={playCurrentSegment}
            disabled={isPlaying || !!selectedAnswer}
            className="w-full h-16 text-lg"
          >
            {isPlaying ? (
              <>
                <PauseCircle className="mr-2 h-6 w-6" />
                Playing...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-6 w-6" />
                Play Segment
              </>
            )}
          </Button>

          <div className="grid gap-3">
            {currentQuestion.options.map((option) => (
              <Button
                key={option.id}
                onClick={() => handleAnswerSelect(option.id)}
                disabled={!!selectedAnswer}
                // variant={
                //   selectedAnswer
                //     ? option.id === currentQuestion.correctOptionId
                //       ? 'success'
                //       : option.id === selectedAnswer
                //         ? 'destructive'
                //         : 'outline'
                //     : 'outline'
                // }
                className={`h-auto py-3 px-4 justify-start text-left ${
                  selectedAnswer && 'cursor-default'
                }`}
              >
                {option.text}
              </Button>
            ))}
          </div>

          {selectedAnswer && (
            <Button onClick={handleNextQuestion} className="w-full">
              <SkipForward className="mr-2 h-5 w-5" />
              {currentQuestionIndex === questions.length - 1
                ? 'Finish Quiz'
                : 'Next Question'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizGame;
