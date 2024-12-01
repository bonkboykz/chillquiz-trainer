import { createReadStream, statSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { parse } from 'path';
import { auth } from '@/lib/auth';
import { Readable } from 'stream';
import { buffer } from 'node:stream/consumers';

const CONTENT_TYPES: { [key: string]: string } = {
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/x-m4a'
};

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const _buf: Uint8Array[] = [];
    stream.on('data', (chunk) => _buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', (err) => reject(err));
  });
}

function nodeStreamToWebStream(nodeStream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(chunk);
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        controller.error(err);
        nodeStream.destroy();
      });
    },
    cancel() {
      nodeStream.destroy();
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ audioId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { audioId } = await params;

    const audio = await prisma.audio.findUnique({
      where: { id: audioId },
      include: {
        quiz: {
          include: {
            attempts: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    });

    if (!audio) {
      return new NextResponse('Audio not found', { status: 404 });
    }

    const hasAccess =
      audio.quiz?.isPublic ||
      audio.quiz?.userId === session.user.id ||
      (audio.quiz?.attempts && audio.quiz?.attempts.length > 0);

    if (!hasAccess) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const filePath = join(process.cwd(), audio.filepath);
    const stat = statSync(filePath);
    const { ext } = parse(filePath);
    const contentType = CONTENT_TYPES[ext.toLowerCase()];

    if (!contentType) {
      return new NextResponse('Unsupported file type', { status: 415 });
    }

    const range = request.headers.get('range');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      // Validate and adjust range values
      if (isNaN(start)) start = 0;
      if (isNaN(end)) end = stat.size - 1;
      if (start >= stat.size) start = 0;
      if (end >= stat.size) end = stat.size - 1;
      if (start > end) start = 0;

      const contentLength = end - start + 1;
      const headers = new Headers({
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(contentLength),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      });

      const stream = createReadStream(filePath, { start, end });
      // buffer the stream to avoid issues with the browser
      // const buffer = Buffer.from(await streamToBuffer(stream));
      // const streamBuffer = await buffer(stream);

      return new NextResponse(nodeStreamToWebStream(stream), {
        status: 206,
        headers
      });
    }

    const headers = new Headers({
      'Content-Length': String(stat.size),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    });

    const stream = createReadStream(filePath);
    return new NextResponse(nodeStreamToWebStream(stream), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error streaming audio:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ audioId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { audioId } = await params;
    const audio = await prisma.audio.findUnique({
      where: { id: audioId },
      include: {
        quiz: true
      }
    });

    if (!audio) {
      return new NextResponse('Audio not found', { status: 404 });
    }

    const filePath = join(process.cwd(), audio.filepath);
    const stat = statSync(filePath);
    const { ext } = parse(filePath);
    const contentType = CONTENT_TYPES[ext.toLowerCase()];

    const headers = new Headers({
      'Content-Length': String(stat.size),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    });

    return new NextResponse(null, { status: 200, headers });
  } catch (error) {
    console.error('Error handling HEAD request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
