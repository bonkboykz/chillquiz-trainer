import { statSync } from 'fs';
import { join } from 'path';

interface AudioMetadata {
  size: number;
  contentType: string;
  duration?: number;
}

export class AudioError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AudioError';
  }
}

export async function getAudioMetadata(
  filepath: string
): Promise<AudioMetadata> {
  try {
    const absolutePath = join(process.cwd(), filepath);
    const stat = statSync(absolutePath);
    const ext = filepath.split('.').pop()?.toLowerCase();

    const contentType = {
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
      wav: 'audio/wav',
      m4a: 'audio/x-m4a'
    }[ext || ''];

    if (!contentType) {
      throw new AudioError('Unsupported file type', 415);
    }

    return {
      size: stat.size,
      contentType
    };
  } catch (error) {
    if (error instanceof AudioError) {
      throw error;
    }
    throw new AudioError(
      'Error getting audio metadata',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export function parseRange(range: string, fileSize: number) {
  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize) {
    throw new AudioError('Invalid range', 416, { fileSize });
  }

  return { start, end };
}

export function validateAccess(
  userId: string,
  audio: {
    quiz?: {
      isPublic?: boolean;
      userId: string;
      attempts: { userId: string }[];
    } | null;
  }
) {
  if (!audio.quiz) {
    throw new AudioError('Audio not associated with a quiz', 404);
  }

  const hasAccess =
    audio.quiz.isPublic ||
    audio.quiz.userId === userId ||
    audio.quiz.attempts.some((attempt) => attempt.userId === userId);

  if (!hasAccess) {
    throw new AudioError('Access denied', 403);
  }
}
