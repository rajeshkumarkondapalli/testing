import { NextRequest, NextResponse } from 'next/server';
import { getOperationStatus } from '@/lib/veo';

export async function POST(request: NextRequest) {
  const apiKey = process.env.VEO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'VEO_API_KEY environment variable is not configured' },
      { status: 500 }
    );
  }

  let body: { operationName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { operationName } = body;

  if (!operationName || typeof operationName !== 'string') {
    return NextResponse.json({ error: 'operationName is required' }, { status: 400 });
  }

  try {
    const operation = await getOperationStatus(operationName, apiKey);

    if (operation.error) {
      return NextResponse.json({
        done: true,
        error: operation.error.message,
      });
    }

    if (operation.done) {
      const samples = operation.response?.generateVideoResponse?.generatedSamples;
      const videoUri = samples?.[0]?.video?.uri;

      return NextResponse.json({
        done: true,
        videoUrl: videoUri || null,
      });
    }

    return NextResponse.json({ done: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check operation status';
    console.error('Status check error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
