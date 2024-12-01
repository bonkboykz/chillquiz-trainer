import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { quizId, score, maxScore } = await request.json();

    const attempt = await prisma.attempt.create({
      data: {
        quizId,
        userId: session.user.id,
        score,
        maxScore
      }
    });

    return NextResponse.json(attempt);
  } catch (error) {
    console.error('Error saving attempt:', error);
    return NextResponse.json(
      { error: 'Error saving attempt' },
      { status: 500 }
    );
  }
}
