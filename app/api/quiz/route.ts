// app/api/quiz/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const prismaUser = await prisma.user.findUniqueOrThrow({
      where: {
        email: session.user.email
      }
    });

    const body = await request.json();
    const { title, description, userId, audioData } = body;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        userId,
        audios: {
          create: audioData.map((audio: any) => ({
            title: audio.title,
            artist: audio.artist,
            source: audio.source,
            filename: audio.filename,
            duration: audio.duration,
            filepath: audio.filepath,
            timeframes: {
              create: audio.timeframes.map((timeframe: any) => ({
                startTime: timeframe.startTime,
                endTime: timeframe.endTime,
                options: {
                  create: timeframe.options.map((option: any) => ({
                    text: option.text,
                    isCorrect: option.isCorrect
                  }))
                }
              }))
            }
          }))
        },
        createdBy: {
          connect: {
            id: prismaUser.id
          }
        }
      },
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

    return NextResponse.json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    return NextResponse.json({ error: 'Error creating quiz' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        isPublic: true
      },
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
        }
      }
    });

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Error fetching quizzes' },
      { status: 500 }
    );
  }
}
