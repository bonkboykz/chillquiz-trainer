import { writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import crypto from 'crypto';
import { auth } from '@/lib/auth';

// Define allowed file types
const ALLOWED_FILE_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/x-m4a'
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadResponse {
  success: boolean;
  filepath?: string;
  error?: string;
}

export async function POST(
  request: Request
): Promise<NextResponse<UploadResponse>> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validate file existence
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create hash from file content for deduplication
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Get file extension from original filename
    const ext = file.name.split('.').pop();
    const fileName = `${hash}.${ext}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }

    // Save the file
    const filepath = join('uploads', fileName);
    const absolutePath = join(process.cwd(), filepath);

    await writeFile(absolutePath, buffer);

    // Return the relative filepath for database storage
    return NextResponse.json({
      success: true,
      filepath: filepath.replace(/\\/g, '/'), // Normalize path separators for cross-platform compatibility
      filename: fileName
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Error uploading file' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  // Ensure user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Get filename from URL
  const url = new URL(request.url);
  const filepath = url.searchParams.get('filepath');

  if (!filepath) {
    return new NextResponse('No filepath provided', { status: 400 });
  }

  try {
    // Construct absolute path
    const absolutePath = join(process.cwd(), filepath);

    // Create a ReadStream for the file
    const file = await fetch(new URL(`file://${absolutePath}`));

    // Set appropriate headers
    return new NextResponse(file.body, {
      headers: {
        'Content-Type': 'audio/*',
        'Content-Disposition': 'inline'
      }
    });
  } catch (error) {
    console.error('Error streaming file:', error);
    return new NextResponse('Error streaming file', { status: 500 });
  }
}
