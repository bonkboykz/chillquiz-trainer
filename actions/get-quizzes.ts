'use server';

import { prisma } from '@/lib/prisma';
import { Attempt, Audio, Option, Quiz } from '@prisma/client';

export type QuizzesWithAudio = Quiz & {
  createdBy: { name: string | null };
  audios: (Audio & {
    timeframes: { options: Option[] }[];
  })[];
  attempts: Attempt[];
};

export const getQuizzes = async (): Promise<QuizzesWithAudio[]> => {
  const quizzes = await prisma.quiz.findMany({
    // where: {
    //   isPublic: true
    // },
    include: {
      audios: {
        include: {
          timeframes: {
            include: {
              options: true
            }
          }
        }
      },
      createdBy: {
        select: {
          name: true
        }
      },
      attempts: true
    }
  });

  return quizzes;
};
