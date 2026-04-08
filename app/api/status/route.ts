import { NextRequest, NextResponse } from 'next/server';
import { getOperationStatus } from '@/lib/veo';
import { pollReplicatePrediction, extractVideoUrl } from '@/lib/replicate';

export async function POST(request: NextRequest) {
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

  // ── Replicate: operationName = "replicate:<predictionId>" ──────────────────
  if (operationName.startsWith('replicate:')) {
    const predictionId = operationName.slice('replicate:'.length);
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN is not configured' }, { status: 500 });
    }
    try {
      const prediction = await pollReplicatePrediction(predictionId, token);

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        return NextResponse.json({ done: true, error: prediction.error ?? 'Replicate generation failed' });
      }

      if (prediction.status === 'succeeded') {
        return NextResponse.json({ done: true, videoUrl: extractVideoUrl(prediction) });
      }

      // still running
      return NextResponse.json({ done: false });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Replicate poll error' },
        { status: 500 }
      );
    }
  }

  // ── Google Veo: operationName = native operation path ─────────────────────
  const apiKey = process.env.VEO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'VEO_API_KEY is not configured' }, { status: 500 });
  }
  try {
    const operation = await getOperationStatus(operationName, apiKey);

    if (operation.error) {
      return NextResponse.json({ done: true, error: operation.error.message });
    }

    if (operation.done) {
      const samples = operation.response?.generateVideoResponse?.generatedSamples;
      const videoUrl = samples?.[0]?.video?.uri ?? null;
      return NextResponse.json({ done: true, videoUrl });
    }

    return NextResponse.json({ done: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status check failed' },
      { status: 500 }
    );
  }
}
