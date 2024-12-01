'use client';
import React, { useEffect, useState } from 'react';
import { Play, Plus } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getQuizzes, QuizzesWithAudio } from 'actions/get-quizzes';

const QuizList = () => {
  const [quizzes, setQuizzes] = useState<QuizzesWithAudio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const quizzes = await getQuizzes();
      setQuizzes(quizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading quizzes...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Anime Music Quizzes</h1>
        <Link href="/quizzes/create">
          <Button className="flex items-center gap-2">
            <Plus size={20} />
            Create Quiz
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map((quiz) => (
          <Card key={quiz.id}>
            <CardHeader>
              <CardTitle>{quiz.title}</CardTitle>
              <CardDescription>{quiz.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>Created by: {quiz.createdBy.name}</p>
                <p>{quiz.audios.length} audio tracks</p>
                <p>
                  {quiz.attempts.length} attempts • Average score:{' '}
                  {quiz.attempts.length > 0
                    ? (
                        quiz.attempts.reduce(
                          (acc, curr) =>
                            acc + (curr.score / curr.maxScore) * 100,
                          0
                        ) / quiz.attempts.length
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/quizzes/${quiz.id}/play`} className="w-full">
                <Button className="w-full flex items-center gap-2">
                  <Play size={20} />
                  Play Quiz
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default QuizList;
