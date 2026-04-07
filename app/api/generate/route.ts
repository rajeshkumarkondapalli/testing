import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/lib/veo';

export async function POST(request: NextRequest) {
  const apiKey = process.env.VEO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'VEO_API_KEY environment variable is not configured' },
      { status: 500 }
    );
  }

  let body: { prompt?: string; aspectRatio?: string; durationSeconds?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { prompt, aspectRatio = '16:9', durationSeconds = 8 } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  if (prompt.trim().length > 1000) {
    return NextResponse.json({ error: 'Prompt must be under 1000 characters' }, { status: 400 });
  }

  try {
    const operation = await generateVideo(
      {
        prompt: prompt.trim(),
        aspectRatio: aspectRatio as '16:9' | '9:16',
        durationSeconds: Math.min(Math.max(durationSeconds, 5), 8),
        numberOfVideos: 1,
      },
      apiKey
    );

    return NextResponse.json({
      operationName: operation.name,
      done: operation.done ?? false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start video generation';
    console.error('Veo generation error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
