import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/lib/veo';
import { startReplicateGeneration, type ReplicateModel } from '@/lib/replicate';
import { generateVideoHuggingFace, type HFModel } from '@/lib/huggingface';

export async function POST(request: NextRequest) {
  let body: {
    prompt?: string;
    aspectRatio?: string;
    durationSeconds?: number;
    provider?: string;
    model?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { prompt, aspectRatio = '16:9', durationSeconds = 8, provider, model } = body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }
  if (prompt.trim().length > 1000) {
    return NextResponse.json({ error: 'Prompt must be under 1000 characters' }, { status: 400 });
  }

  const cleanPrompt = prompt.trim();

  // ── Replicate ──────────────────────────────────────────────────────────────
  if (provider === 'replicate') {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'REPLICATE_API_TOKEN is not configured' }, { status: 500 });
    }
    try {
      const prediction = await startReplicateGeneration(
        cleanPrompt,
        token,
        (model as ReplicateModel) ?? 'wavespeedai/wan-2.1-t2v-480p',
        aspectRatio
      );

      // If it already finished in the initial wait=5 window
      if (prediction.status === 'succeeded') {
        const { extractVideoUrl } = await import('@/lib/replicate');
        return NextResponse.json({
          operationName: `replicate:${prediction.id}`,
          done: true,
          videoUrl: extractVideoUrl(prediction),
        });
      }

      if (prediction.status === 'failed') {
        return NextResponse.json({ error: prediction.error ?? 'Replicate generation failed' }, { status: 500 });
      }

      return NextResponse.json({
        operationName: `replicate:${prediction.id}`,
        done: false,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Replicate error' },
        { status: 500 }
      );
    }
  }

  // ── HuggingFace ────────────────────────────────────────────────────────────
  if (provider === 'huggingface') {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'HUGGINGFACE_API_TOKEN is not configured' }, { status: 500 });
    }
    try {
      // HF is synchronous — blocks until done (may take 1-3 min)
      const videoUrl = await generateVideoHuggingFace(
        cleanPrompt,
        token,
        (model as HFModel) ?? 'zeroscope'
      );
      return NextResponse.json({ operationName: null, done: true, videoUrl });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'HuggingFace error' },
        { status: 500 }
      );
    }
  }

  // ── Google Veo (default) ───────────────────────────────────────────────────
  const apiKey = process.env.VEO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'No video provider configured. Set REPLICATE_API_TOKEN, HUGGINGFACE_API_TOKEN, or VEO_API_KEY in your .env.local' },
      { status: 500 }
    );
  }
  try {
    const operation = await generateVideo(
      {
        prompt: cleanPrompt,
        aspectRatio: aspectRatio as '16:9' | '9:16',
        durationSeconds: Math.min(Math.max(durationSeconds, 5), 8),
        numberOfVideos: 1,
      },
      apiKey
    );
    return NextResponse.json({ operationName: operation.name, done: operation.done ?? false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Veo generation failed' },
      { status: 500 }
    );
  }
}
