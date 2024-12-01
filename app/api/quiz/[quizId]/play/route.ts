import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

interface QuizQuestion {
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    // Get quiz with all timeframes and options
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        audios: {
          include: {
            timeframes: {
              include: {
                options: true
              }
            }
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Collect all timeframes from all audios
    const allTimeframes = quiz.audios.flatMap((audio) =>
      audio.timeframes.map((timeframe) => ({
        ...timeframe,
        audioId: audio.id
      }))
    );

    // Randomly select 10 timeframes (or less if not enough available)
    const selectedTimeframes = shuffleArray(allTimeframes).slice(
      0,
      Math.min(10, allTimeframes.length)
    );

    // Format questions
    const questions: QuizQuestion[] = selectedTimeframes.map((timeframe) => {
      const correctOption = timeframe.options.find((opt) => opt.isCorrect)!;
      return {
        timeframeId: timeframe.id,
        audioId: timeframe.audioId,
        startTime: timeframe.startTime,
        endTime: timeframe.endTime,
        options: shuffleArray(timeframe.options).map((opt) => ({
          id: opt.id,
          text: opt.text
        })),
        correctOptionId: correctOption.id
      };
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { error: 'Error generating quiz' },
      { status: 500 }
    );
  }
}

// Utility function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
